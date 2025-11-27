/**
 * API endpoint for searching products for offer creation
 * Returns all variants for each product, including price and inventory info
 * Uses Medusa V2 Query system for correct pricing and inventory
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import {
	ContainerRegistrationKeys,
	getVariantAvailability,
} from '@medusajs/framework/utils';

import MeilisearchModuleService from '../../../../../modules/meilisearch/service';
import { getDefaultSalesChannelIdFromQuery } from '../../../../../utils/sales-channel-helper';

interface SearchProductsQuery {
	q?: string;
	limit?: string;
	category_id?: string;
	collection_id?: string;
	status?: string;
	region_id?: string;
	currency_code?: string;
	// sales_channel_id is now hardcoded for this customer's use case
}

/**
 * Helper function to build Meilisearch filter strings from base filters
 * Converts Medusa filter format to Meilisearch filter syntax
 */
function buildMeilisearchFilters(baseFilters: any): string | undefined {
	const filters: string[] = [];

	if (baseFilters.status) {
		filters.push(`status = "${baseFilters.status}"`);
	}

	if (baseFilters.category_id) {
		filters.push(`category_ids = "${baseFilters.category_id}"`);
	}

	if (baseFilters.collection_id) {
		filters.push(`collection_id = "${baseFilters.collection_id}"`);
	}

	return filters.length > 0 ? filters.join(' AND ') : undefined;
}

export async function GET(
	req: MedusaRequest<SearchProductsQuery>,
	res: MedusaResponse,
) {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
	try {
		const {
			q = '',
			limit = '10',
			category_id = '',
			collection_id = '',
			status = 'published',
			region_id = '',
			currency_code = 'eur',
		} = req.query as Record<string, string>;

		const take = parseInt(limit);

		// Get the query module
		const query = req.scope.resolve('query');

		// Get the Meilisearch module service for text search
		const meilisearchModuleService = req.scope.resolve(
			'meilisearch',
		) as MeilisearchModuleService;

		// Get the default sales channel ID dynamically
		const sales_channel_id = await getDefaultSalesChannelIdFromQuery(query);
		logger.info(`[DEBUG] Using sales channel ID: ${sales_channel_id}`);

		// Build base filters (without query)
		const baseFilters: any = {};
		if (category_id) baseFilters.category_id = category_id;
		if (collection_id) baseFilters.collection_id = collection_id;
		if (status) baseFilters.status = status;

		// Query products with variants and prices
		const useCalculatedPrice = Boolean(
			region_id && region_id.trim() && currency_code && currency_code.trim(),
		);

		// Build fields array conditionally
		const fields = [
			'*',
			'variants.*',
			'variants.prices.*',
			'categories.*',
			'options.*',
		];

		// Only include calculated_price if we have proper context
		if (useCalculatedPrice) {
			fields.push('variants.calculated_price.*');
		}

		// Smart search: Check for ID search first, then use Meilisearch
		let products: any[] = [];
		const searchQuery = q?.trim() || '';

		if (searchQuery) {
			// Check if searching by product ID (full or partial)
			const isProductIdSearch =
				searchQuery.startsWith('prod_') || /^[A-Z0-9]{8}$/i.test(searchQuery);

			if (isProductIdSearch) {
				// Search by product ID (exact or partial match)
				logger.info(`[DEBUG] Searching by product ID: "${searchQuery}"`);

				try {
					// For full IDs, use exact match; for partial (8 chars), search all products and filter
					if (searchQuery.startsWith('prod_')) {
						// Full ID search
						const { data } = await query.graph({
							entity: 'product',
							fields,
							filters: { ...baseFilters, id: searchQuery },
							pagination: { take: 1, skip: 0 },
							context: useCalculatedPrice
								? {
										variants: {
											calculated_price: {
												region_id,
												currency_code,
											},
										},
									}
								: undefined,
						});
						products = data || [];
					} else {
						// Partial ID search (last 8 characters)
						const { data } = await query.graph({
							entity: 'product',
							fields,
							filters: baseFilters,
							pagination: { take: 100, skip: 0 },
							context: useCalculatedPrice
								? {
										variants: {
											calculated_price: {
												region_id,
												currency_code,
											},
										},
									}
								: undefined,
						});
						// Filter by partial ID match
						products = (data || [])
							.filter((p: any) =>
								p.id.toLowerCase().includes(searchQuery.toLowerCase()),
							)
							.slice(0, take);
					}

					logger.info(`[DEBUG] Found ${products.length} products by ID search`);
				} catch (error) {
					logger.error(`[DEBUG] ID search failed: ${error.message}`);
					products = [];
				}
			} else {
				// Use Meilisearch for all text search (supports fuzzy matching, typos, and substring search)
				logger.info(`[DEBUG] Using Meilisearch text search: "${searchQuery}"`);

				try {
					// Build Meilisearch filters from base filters
					const meilisearchFilter = buildMeilisearchFilters(baseFilters);

					// Search in Meilisearch index
					const meilisearchResults =
						await meilisearchModuleService.searchWithFacets(
							searchQuery,
							{
								filters: meilisearchFilter ? [meilisearchFilter] : undefined,
								limit: take,
							},
							'product',
						);

					logger.info(
						`[DEBUG] Meilisearch returned ${meilisearchResults.hits.length} results`,
					);

					// Extract product IDs from Meilisearch results
					const productIds = meilisearchResults.hits.map((hit: any) => hit.id);

					// Fetch full product data from Medusa for these IDs
					if (productIds.length > 0) {
						const { data } = await query.graph({
							entity: 'product',
							fields,
							filters: { ...baseFilters, id: productIds },
							pagination: { take: productIds.length, skip: 0 },
							context: useCalculatedPrice
								? {
										variants: {
											calculated_price: {
												region_id,
												currency_code,
											},
										},
									}
								: undefined,
						});
						products = data || [];

						// Sort products to match Meilisearch result order
						const idOrder = new Map<string, number>(
							productIds.map((id, index) => [id, index]),
						);
						products.sort((a: any, b: any) => {
							const aIndex = idOrder.get(a.id);
							const bIndex = idOrder.get(b.id);
							return (
								(aIndex !== undefined ? aIndex : 999) -
								(bIndex !== undefined ? bIndex : 999)
							);
						});
					} else {
						products = [];
					}
				} catch (meilisearchError) {
					// Fallback to Medusa query API if Meilisearch fails
					logger.error(
						`[DEBUG] Meilisearch search failed, falling back to Query API: ${meilisearchError.message}`,
					);
					const { data } = await query.graph({
						entity: 'product',
						fields,
						filters: { ...baseFilters, q: searchQuery },
						pagination: { take, skip: 0 },
						context: useCalculatedPrice
							? {
									variants: {
										calculated_price: {
											region_id,
											currency_code,
										},
									},
								}
							: undefined,
					});
					products = data || [];
				}
			}
		} else {
			// No query - return all products (or empty)
			const { data } = await query.graph({
				entity: 'product',
				fields,
				filters: baseFilters,
				pagination: { take, skip: 0 },
				context: useCalculatedPrice
					? {
							variants: {
								calculated_price: {
									region_id,
									currency_code,
								},
							},
						}
					: undefined,
			});
			products = data || [];
		}

		logger.info(`[DEBUG] Found ${products.length} products for query "${q}"`);

		// Get inventory data using Medusa V2 getVariantAvailability utility
		const allVariantIds = products.flatMap((p: any) =>
			p.variants ? p.variants.map((v: any) => v.id) : [],
		);
		let inventoryMap: Record<string, number> = {};

		if (allVariantIds.length > 0) {
			logger.info(
				`[DEBUG] Looking up inventory for ${allVariantIds.length} variants with sales_channel_id: ${sales_channel_id}`,
			);

			try {
				// @ts-ignore - Type conflict between @medusajs/types versions
				const availability = await getVariantAvailability(query, {
					variant_ids: allVariantIds,
					sales_channel_id,
				});

				// Map variant IDs to available quantities
				inventoryMap = Object.fromEntries(
					Object.entries(availability).map(
						([variantId, data]: [string, any]) => [
							variantId,
							data.availability || 0,
						],
					),
				);

				logger.info(`[DEBUG] Inventory map: ${JSON.stringify(inventoryMap)}`);
			} catch (error) {
				logger.error(
					`[DEBUG] Error getting variant availability: ${error.message}`,
				);
				// Fallback: set all variants to 0 inventory
				allVariantIds.forEach(variantId => {
					inventoryMap[variantId] = 0;
				});
			}
		} else {
			logger.warn(`[DEBUG] No variants found. Setting inventory to 0.`);
			// Set all variants to 0 inventory when no variants found
			allVariantIds.forEach(variantId => {
				inventoryMap[variantId] = 0;
			});
		}

		// Format results for the frontend
		const formattedProducts = products.map((product: any) => {
			const variants = (product.variants || []).map((variant: any) => {
				// Prefer calculated price if available, else fallback to first price
				let price: { amount: number; currency_code: string } | null = null;
				if (
					variant.calculated_price &&
					typeof variant.calculated_price.calculated_amount === 'number'
				) {
					price = {
						amount: Math.round(
							variant.calculated_price.calculated_amount * 100,
						), // Convert euros to cents
						currency_code: variant.calculated_price.currency_code,
					};
				} else if (variant.prices && variant.prices.length > 0) {
					price = {
						amount: Math.round(variant.prices[0].amount * 100), // Convert euros to cents
						currency_code: variant.prices[0].currency_code,
					};
				}
				// Log the price for debugging
				logger.info(
					`[PRICE-TRACE] Product: ${product.title} | Variant: ${variant.title} | Price amount: ${price?.amount}`,
				);
				return {
					id: variant.id,
					title: variant.title,
					sku: variant.sku,
					price,
					inventory_quantity: inventoryMap[variant.id] ?? 0,
					weight: variant.weight,
					allow_backorder: variant.allow_backorder,
					manage_inventory: variant.manage_inventory,
				};
			});
			return {
				id: product.id,
				title: product.title,
				name: product.title, // For compatibility
				description: product.description,
				category: product.categories?.[0]?.name,
				handle: product.handle,
				status: product.status,
				thumbnail: product.thumbnail,
				options: product.options,
				variants,
				variants_count: variants.length,
			};
		});

		logger.info(
			`Product search completed: ${formattedProducts.length} results for query "${q}"`,
		);
		res.json({
			products: formattedProducts,
			count: formattedProducts.length,
			total: products.length,
		});
	} catch (error) {
		logger.error('Product search error:', error);
		res.status(500).json({
			error: 'Failed to search products',
			message: error.message,
		});
	}
}
