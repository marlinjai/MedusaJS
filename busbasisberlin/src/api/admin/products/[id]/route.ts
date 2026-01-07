// busbasisberlin/src/api/admin/products/[id]/route.ts
// Admin API route to get and update an existing product

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import {
	batchVariantImagesWorkflow,
	linkProductsToSalesChannelWorkflow,
	updateProductsWorkflow,
} from '@medusajs/medusa/core-flows';
import {
	getStoreSupportedCurrencies,
	getStoreSupportedCurrencyCodes,
} from '../../../../utils/currency-helper';

type ProductUpdateBody = {
	title?: string;
	subtitle?: string;
	handle?: string;
	description?: string;
	status?: 'draft' | 'published';
	discountable?: boolean;
	type_id?: string;
	collection_id?: string;
	category_ids?: string[];
	tags?: string[];
	shipping_profile_id?: string;
	sales_channel_ids?: string[];
	variants?: any[];
	has_variants?: boolean;
	options?: Array<{ title: string; values: string[] }>;
	images?: Array<{ url: string }>;
	thumbnail?: string;
};

// GET handler to fetch a single product by ID
export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { id } = req.params;

		if (!id) {
			res.status(400).json({
				error: 'Validation error',
				message: 'Product ID is required',
			});
			return;
		}

		// Fetch store-supported currencies using shared service
		const availableCurrencies = await getStoreSupportedCurrencies(
			req.scope,
			logger,
		);

		// Use query.graph which handles all linked relations (pricing, sales channels, etc.)
		const query = req.scope.resolve('query');

		// Fetch product with all relations including linked ones
		const result = await query.graph({
			entity: 'product',
			fields: [
				'id',
				'title',
				'subtitle',
				'handle',
				'status',
				'description',
				'discountable',
				'thumbnail',
				'metadata',
				'images.id',
				'images.url',
				'images.variants.id', // Critical: enables variant image filtering
				'tags.id',
				'tags.value',
				'categories.id',
				'categories.name',
				'sales_channels.id',
				'sales_channels.name',
				'type.id',
				'type.value',
				'shipping_profile.id',
				'shipping_profile.name',
				'collection.id',
				'collection.title',
				'variants.id',
				'variants.title',
				'variants.sku',
				'variants.manage_inventory',
				'variants.allow_backorder',
				'variants.prices.*',
				'variants.images.id',
				'variants.images.url',
				'variants.options.id',
				'variants.options.value',
				'options.id',
				'options.title',
				'options.values.id',
				'options.values.value',
			],
			filters: { id },
		});

		const product = Array.isArray(result?.data) ? result.data[0] : null;

		if (!product) {
			res.status(404).json({
				error: 'Not found',
				message: 'Product not found',
			});
			return;
		}

		// Fetch variant thumbnails separately since query.graph doesn't return them
		// This is a workaround for query.graph limitation
		const productModuleService = req.scope.resolve(Modules.PRODUCT);
		const variantThumbnails = new Map<string, string>();

		if (product.variants && product.variants.length > 0) {
			try {
				// Fetch full variant data including thumbnail using productModuleService
				const variantIds = product.variants.map((v: any) => v.id);
				const fullVariants = await productModuleService.listProductVariants(
					{ id: variantIds },
					{ select: ['id', 'thumbnail'] },
				);

				for (const v of fullVariants) {
					if (v.thumbnail) {
						variantThumbnails.set(v.id, v.thumbnail);
						logger.info(
							`[PRODUCT-GET] Found thumbnail for variant ${v.id}: ${v.thumbnail.substring(0, 50)}...`,
						);
					}
				}
			} catch (error) {
				logger.error('[PRODUCT-GET] Error fetching variant thumbnails:', error);
			}
		}

		// Filter variant images to only include images specifically associated with each variant
		// This replicates buildVariantImagesFromProduct logic from the product module
		if (product.variants && product.images) {
			// Build a map of image ID -> variant IDs it's associated with
			const imageVariantMap = new Map<string, string[]>();
			for (const image of product.images as any[]) {
				const variantIds = (image.variants || []).map((v: any) => v.id);
				imageVariantMap.set(image.id, variantIds);
			}

			// For each variant, filter images and transform prices for frontend
			for (const variant of product.variants) {
				const variantImages: any[] = [];
				for (const image of product.images) {
					const associatedVariants = imageVariantMap.get(image.id) || [];
					// Include image if it's specifically associated with this variant
					if (associatedVariants.includes(variant.id)) {
						variantImages.push({ id: image.id, url: image.url });
					}
				}
				variant.images = variantImages;

				// Map database thumbnail field to frontend variant_thumbnail field
				// Use separately fetched thumbnail since query.graph doesn't return it
				const thumbnail = variantThumbnails.get(variant.id);
				if (thumbnail) {
					(variant as any).variant_thumbnail = thumbnail;
					logger.info(
						`[PRODUCT-GET] Mapped thumbnail for variant ${variant.id}: ${thumbnail.substring(0, 50)}...`,
					);
				}

				// Transform prices: Convert from Medusa format to frontend format
				// Medusa stores: [{ currency_code: 'eur', amount: 1000 }]
				// Frontend expects: { price_eur: 10, price_usd: 20, ... }
				if ((variant as any).prices && Array.isArray((variant as any).prices)) {
					for (const price of (variant as any).prices) {
						// Sanitize invalid currency codes
						if (price.currency_code === 'europe') {
							logger.warn(
								`[PRODUCT-GET] Fixing invalid currency code "europe" → "eur" for price ${price.id}`,
							);
							price.currency_code = 'eur';
						}

						// Add price_<currency> fields for frontend
						// Prices are stored directly in euros/dollars (NOT cents)
						const currencyCode = price.currency_code.toLowerCase();

						// Use amount field directly - it's already in the correct currency unit
						const amountInDisplayFormat = parseFloat(price.amount || 0);
						(variant as any)[`price_${currencyCode}`] = amountInDisplayFormat;

						console.log(
							`[PRODUCT-GET] ✅ Variant ${variant.sku}: price_${currencyCode} = ${amountInDisplayFormat} (stored as: ${price.amount})`,
						);
					}
				}
			}
		}

		logger.info(`[PRODUCT-GET] Product fetched: ${id}`);

		// Log variant images for debugging
		if (product.variants) {
			product.variants.forEach((v: any, i: number) => {
				logger.info(
					`[PRODUCT-GET] Variant ${i} (${v.sku}): ${v.images?.length || 0} images`,
				);
			});
		}

		// Disable HTTP caching to ensure fresh data
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
		res.setHeader('Pragma', 'no-cache');
		res.setHeader('Expires', '0');

		res.json({
			product,
			available_currencies: availableCurrencies, // Frontend uses this to render currency columns dynamically
		});
	} catch (error) {
		logger.error('[PRODUCT-GET] Error fetching product:', error);
		res.status(500).json({
			error: 'Failed to fetch product',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};

export const PUT = async (
	req: MedusaRequest<ProductUpdateBody>,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { id } = req.params;
		const {
			title,
			subtitle,
			handle,
			description,
			status,
			discountable,
			type_id,
			collection_id,
			category_ids,
			tags,
			shipping_profile_id,
			sales_channel_ids,
			variants,
			has_variants,
			options,
			images,
			thumbnail,
		} = req.body;

		// Fetch store-supported currency codes using shared service
		const supportedCurrencies = await getStoreSupportedCurrencyCodes(
			req.scope,
			logger,
		);

		// Build dynamic currency field mapping based on available currencies
		// Maps frontend field names (price_eur, price_usd) to ISO currency codes
		const CURRENCY_FIELD_MAP: Record<string, string> = {};

		// Add mappings for all supported currencies
		supportedCurrencies.forEach(code => {
			CURRENCY_FIELD_MAP[`price_${code}`] = code;
		});

		logger.info(
			`[PRODUCT-UPDATE] Currency field mappings: ${Object.keys(CURRENCY_FIELD_MAP).join(', ')}`,
		);

		// Debug logging
		logger.info(`[PRODUCT-UPDATE] Starting update for product ${id}`);
		logger.info(`[PRODUCT-UPDATE] Thumbnail received: ${thumbnail || 'none'}`);
		logger.info(
			`[PRODUCT-UPDATE] Product images received: ${images?.length || 0}`,
		);
		// Log image IDs to verify they're being received
		if (images && images.length > 0) {
			images.forEach((img: any, idx: number) => {
				logger.info(
					`[PRODUCT-UPDATE]   Image ${idx}: id=${img.id || 'NO_ID'}, url=${img.url?.substring(0, 50)}...`,
				);
			});
		}
		logger.info(`[PRODUCT-UPDATE] Variants received: ${variants?.length || 0}`);
		if (variants && variants.length > 0) {
			variants.forEach((v: any, idx: number) => {
				const variantImages = v.images || [];
				logger.info(
					`[PRODUCT-UPDATE] Variant ${idx} (${v.sku || v.title || 'no-identifier'}): ${variantImages.length} images, thumbnail: ${v.variant_thumbnail || 'none'}`,
				);
				if (variantImages.length > 0) {
					variantImages.forEach((img: any, imgIdx: number) => {
						logger.info(
							`[PRODUCT-UPDATE]   Variant ${idx} image ${imgIdx}: ${img.url}`,
						);
					});
				}
			});
		}

		if (!id) {
			res.status(400).json({
				error: 'Validation error',
				message: 'Product ID is required',
			});
			return;
		}

		const productModuleService = req.scope.resolve(Modules.PRODUCT);
		const query = req.scope.resolve('query');

		// Convert tag values to tag IDs, then to correct format for workflow
		let tagObjects: Array<{ id: string }> = [];
		if (tags !== undefined) {
			const tagIds: string[] = [];

			if (Array.isArray(tags) && tags.length > 0) {
				// For each tag value, find or create the tag
				for (const tagValue of tags) {
					if (!tagValue || typeof tagValue !== 'string') continue;

					// Check if tag exists
					const existingTags = await productModuleService.listProductTags({
						value: tagValue,
					});

					let tagId: string;
					if (existingTags.length > 0) {
						tagId = existingTags[0].id;
					} else {
						// Create new tag
						const [newTag] = await productModuleService.createProductTags([
							{ value: tagValue },
						]);
						tagId = newTag.id;
						logger.info(`[PRODUCT-UPDATE] Created new tag: ${tagValue}`);
					}

					tagIds.push(tagId);
				}
			}

			// Convert to workflow format: tags: [{id: string}]
			tagObjects = tagIds.map(tagId => ({ id: tagId }));
		}

		// Convert category_ids to correct format for workflow: categories: [{id: string}]
		// Only process if explicitly provided (not undefined)
		let categoryObjects: Array<{ id: string }> | undefined = undefined;
		if (category_ids !== undefined && Array.isArray(category_ids)) {
			categoryObjects = category_ids.map(catId => ({ id: catId }));
		}

		// Prepare update data for workflow
		// According to Medusa docs, updateProductsWorkflow accepts:
		// - Direct fields: title, subtitle, handle, description, status, discountable
		// - Relations: type_id, collection_id, shipping_profile_id
		// - Arrays: images: [{url}], tags: [{id}], categories: [{id}], options, variants
		const updateData: any = {
			id,
		};

		if (title !== undefined) {
			updateData.title = title;
		}

		if (subtitle !== undefined) {
			updateData.subtitle = subtitle || null;
		}

		if (handle !== undefined) {
			updateData.handle = handle;
		}

		if (description !== undefined) {
			updateData.description = description || null;
		}

		if (images !== undefined && images.length > 0) {
			// IMPORTANT: Include image ID if it exists to preserve existing images
			// Without ID, Medusa recreates images with new IDs, breaking variant associations
			updateData.images = images.map((img: any) => {
				const imageData: { url: string; id?: string } = { url: img.url };
				if (img.id) {
					imageData.id = img.id;
				}
				return imageData;
			});
		}

		if (status !== undefined) {
			updateData.status = status;
		}

		if (discountable !== undefined) {
			updateData.discountable = discountable;
		}

		if (type_id !== undefined) {
			updateData.type_id = type_id || null;
		}

		if (collection_id !== undefined) {
			updateData.collection_id = collection_id || null;
		}

		if (shipping_profile_id !== undefined) {
			updateData.shipping_profile_id = shipping_profile_id || null;
		}

		if (thumbnail !== undefined) {
			updateData.thumbnail = thumbnail || null;
			logger.info(
				`[PRODUCT-UPDATE] Thumbnail added to updateData: ${thumbnail || 'null'}`,
			);
		}

		// Add tags in correct format: tags: [{id: string}]
		// Only update if tags was explicitly provided in the request
		if (tags !== undefined) {
			updateData.tags = tagObjects;
		}

		// Add categories in correct format: categories: [{id: string}]
		// Only update if category_ids was explicitly provided in the request
		if (categoryObjects !== undefined) {
			updateData.categories = categoryObjects;
		}

		// Handle product options update
		if (has_variants !== undefined && options !== undefined) {
			updateData.options = options.map((option: any) => ({
				title: option.title,
				values: option.values || [],
			}));
		}

		// Handle variants if provided
		if (variants !== undefined && variants.length > 0) {
			updateData.variants = variants.map((variant: any) => {
				const variantData: any = {};
				if (variant.id) variantData.id = variant.id;
				if (variant.title) variantData.title = variant.title;
				if (variant.sku) variantData.sku = variant.sku;
				if (variant.manage_inventory !== undefined)
					variantData.manage_inventory = variant.manage_inventory;
				if (variant.allow_backorder !== undefined)
					variantData.allow_backorder = variant.allow_backorder;
				// Set variant thumbnail if provided
				if (variant.variant_thumbnail !== undefined) {
					variantData.thumbnail = variant.variant_thumbnail;
					logger.info(
						`[PRODUCT-UPDATE] Setting thumbnail for variant ${variant.sku}: ${variant.variant_thumbnail}`,
					);
				}

				// Handle variant options - convert to Record<string, string> format
				if (
					has_variants &&
					options &&
					variant.option_values &&
					variant.option_values.length > 0
				) {
					const variantOptions: Record<string, string> = {};
					options.forEach((option: any, optionIndex: number) => {
						const value = variant.option_values[optionIndex];
						const valueStr =
							typeof value === 'string' ? value : String(value || '');
						if (valueStr && option.values && option.values.includes(valueStr)) {
							variantOptions[option.title] = valueStr;
						}
					});
					if (Object.keys(variantOptions).length > 0) {
						variantData.options = variantOptions;
					}
				}

				// Handle prices
				// Use the dynamically loaded CURRENCY_FIELD_MAP from Currency Module
				logger.info(
					`[PRODUCT-UPDATE] Variant ${variant.sku || variant.id} price data: prices=${JSON.stringify(variant.prices)}, price_eur=${variant.price_eur} (type: ${typeof variant.price_eur})`,
				);

				// Check if any price fields were provided
				const priceFields = Object.keys(variant).filter(key =>
					key.startsWith('price_'),
				);
				const hasPriceFields = priceFields.some(
					field => variant[field] !== undefined,
				);

				if (hasPriceFields) {
					// Collect all price entries from the variant data
					const priceEntries: Array<{ currency_code: string; amount: number }> =
						[];

					for (const field of priceFields) {
						const value = variant[field];
						if (value !== undefined) {
							// Map the field name to a currency code
							const currencyCode = CURRENCY_FIELD_MAP[field];

							if (!currencyCode) {
								logger.warn(
									`[PRODUCT-UPDATE] Unknown price field "${field}" - skipping. Add mapping to CURRENCY_FIELD_MAP.`,
								);
								continue;
							}

							// Prices are stored directly in euros/dollars (NOT cents in this system)
							// Frontend sends display values, we store them as-is
							const amount = parseFloat(value || 0);

							priceEntries.push({
								currency_code: currencyCode,
								amount: amount,
							});

							logger.info(
								`[PRODUCT-UPDATE] Price set: ${field}=${value} → ${currencyCode.toUpperCase()} ${amount}`,
							);
						}
					}

					// No deduplication needed - each currency has exactly one field
					variantData.prices = priceEntries;
					logger.info(
						`[PRODUCT-UPDATE] Final prices: ${JSON.stringify(priceEntries)}`,
					);
				} else if (variant.prices) {
					// Fallback: use existing prices array if no explicit price fields
					// Sanitize currency codes to prevent invalid codes like "europe"
					variantData.prices = (variant.prices as any[]).map(price => {
						const sanitizedPrice = { ...price };
						// Convert invalid "europe" currency code to "eur"
						if (sanitizedPrice.currency_code === 'europe') {
							logger.warn(
								`[PRODUCT-UPDATE] Sanitizing invalid currency code "europe" → "eur" for variant ${variant.sku || variant.id}`,
							);
							sanitizedPrice.currency_code = 'eur';
						}
						return sanitizedPrice;
					});
					logger.info(
						`[PRODUCT-UPDATE] Using variant.prices (sanitized): ${JSON.stringify(variantData.prices)}`,
					);
				} else {
					logger.warn(
						`[PRODUCT-UPDATE] No price data found for variant ${variant.sku || variant.id}`,
					);
				}

				return variantData;
			});
		}

		// Update product using workflow with correct format
		logger.info(
			`[PRODUCT-UPDATE] Calling updateProductsWorkflow with data: ${JSON.stringify(
				{
					id: updateData.id,
					hasThumbnail: !!updateData.thumbnail,
					hasImages: !!updateData.images,
					imagesCount: updateData.images?.length || 0,
					variantsCount: updateData.variants?.length || 0,
				},
			)}`,
		);
		const { result } = await updateProductsWorkflow(req.scope).run({
			input: {
				products: [updateData],
			},
		});

		const updatedProduct = result[0];
		logger.info(
			`[PRODUCT-UPDATE] Product updated via workflow. Thumbnail: ${updatedProduct?.thumbnail || 'none'}`,
		);

		// Helper function to resolve image URLs to IDs
		// Queries product images and creates a map of URL -> ID
		const resolveImageIds = async (
			imageUrls: string[],
		): Promise<Map<string, string>> => {
			const urlToIdMap = new Map<string, string>();

			if (imageUrls.length === 0) {
				return urlToIdMap;
			}

			// Query product images to get IDs
			const imageResult = await query.graph({
				entity: 'product',
				fields: ['id', 'images.id', 'images.url'],
				filters: { id },
			});

			const product = Array.isArray(imageResult?.data)
				? imageResult.data[0]
				: null;

			if (product && (product as any).images) {
				const productImages = (product as any).images || [];
				logger.info(
					`[PRODUCT-UPDATE] Found ${productImages.length} product images to resolve`,
				);
				for (const img of productImages) {
					if (img.url && img.id) {
						urlToIdMap.set(img.url, img.id);
						logger.info(
							`[PRODUCT-UPDATE] Mapped image URL to ID: ${img.url.substring(0, 50)}... -> ${img.id}`,
						);
					}
				}
			} else {
				logger.warn(
					`[PRODUCT-UPDATE] No product images found when resolving image IDs`,
				);
			}

			logger.info(
				`[PRODUCT-UPDATE] Resolved ${urlToIdMap.size} image IDs from ${imageUrls.length} URLs`,
			);
			return urlToIdMap;
		};

		// Map to store updated variant images after workflows complete
		// Key: variant ID, Value: array of image objects with id and url
		// Declared outside variants block so it's accessible for response construction
		const updatedVariantImagesMap = new Map<
			string,
			Array<{ id: string; url: string }>
		>();

		// Process variant images if variants were provided
		if (variants !== undefined && variants.length > 0) {
			// First, get all variant image URLs from the request
			const variantImageUrls = new Set<string>();
			for (const variant of variants) {
				if (variant.images && Array.isArray(variant.images)) {
					for (const img of variant.images) {
						if (img.url) {
							variantImageUrls.add(img.url);
						}
					}
				}
			}

			// Resolve image URLs to IDs
			logger.info(
				`[PRODUCT-UPDATE] Resolving ${variantImageUrls.size} unique variant image URLs to IDs`,
			);
			const imageUrlToIdMap = await resolveImageIds(
				Array.from(variantImageUrls),
			);
			logger.info(
				`[PRODUCT-UPDATE] Image resolution complete. Map size: ${imageUrlToIdMap.size}`,
			);

			// Query updated product to get variant IDs
			const variantResult = await query.graph({
				entity: 'product',
				fields: ['id', 'variants.id', 'variants.sku', 'variants.title'],
				filters: { id },
			});

			const productWithVariants = Array.isArray(variantResult?.data)
				? variantResult.data[0]
				: null;

			if (productWithVariants && (productWithVariants as any).variants) {
				const updatedVariants = (productWithVariants as any).variants || [];
				logger.info(
					`[PRODUCT-UPDATE] Found ${updatedVariants.length} updated variants to process`,
				);

				// Process each variant's images
				for (let i = 0; i < variants.length; i++) {
					const variant = variants[i];
					logger.info(
						`[PRODUCT-UPDATE] Processing variant ${i}: ${variant.sku || variant.title || 'no-identifier'}, has ${variant.images?.length || 0} images`,
					);

					// Find the corresponding updated variant by matching ID, SKU, title, or index
					let updatedVariant = updatedVariants.find((v: any) => {
						if (variant.id && v.id === variant.id) return true;
						if (variant.sku && v.sku === variant.sku) return true;
						if (variant.title && v.title === variant.title) return true;
						return false;
					});

					// Fallback: match by index if no other match found (for new variants)
					if (!updatedVariant && i < updatedVariants.length) {
						updatedVariant = updatedVariants[i];
						logger.info(
							`[PRODUCT-UPDATE] Matched variant ${i} by index fallback`,
						);
					}

					if (!updatedVariant || !updatedVariant.id) {
						logger.warn(
							`[PRODUCT-UPDATE] Could not find variant ID for variant: ${variant.sku || variant.title || `index ${i}`}`,
						);
						continue;
					}

					logger.info(
						`[PRODUCT-UPDATE] Matched variant to ID: ${updatedVariant.id}`,
					);

					// Query variant images separately to get current state
					// Use same filtering logic as GET handler: only count images specifically associated with this variant
					// Disable cache to ensure we get fresh data
					let currentImageIds: string[] = [];
					try {
						const variantImageResult = await query.graph(
							{
								entity: 'product_variant',
								fields: ['id', 'images.id', 'images.url', 'images.variants.id'],
								filters: { id: updatedVariant.id },
							},
							{
								cache: {
									enable: false, // Force fresh query to avoid stale cache
								},
							},
						);

						const variantWithImages = Array.isArray(variantImageResult?.data)
							? variantImageResult.data[0]
							: null;

						if (variantWithImages && (variantWithImages as any).images) {
							// Filter images to only those specifically associated with this variant
							// This matches the GET handler's filtering logic
							const allImages = (variantWithImages as any).images || [];
							currentImageIds = allImages
								.filter((img: any) => {
									// Only include images where variants array includes this variant's ID
									const associatedVariants = (img.variants || []).map(
										(v: any) => v.id,
									);
									return associatedVariants.includes(updatedVariant.id);
								})
								.map((img: any) => img.id);

							logger.info(
								`[PRODUCT-UPDATE] Queried variant ${updatedVariant.id} current images: ${currentImageIds.length} images (filtered from ${allImages.length} total)`,
							);
							if (currentImageIds.length > 0) {
								logger.info(
									`[PRODUCT-UPDATE] Current variant image IDs: ${currentImageIds.join(', ')}`,
								);
							}
						}
					} catch (error: any) {
						logger.warn(
							`[PRODUCT-UPDATE] Failed to query variant images for ${updatedVariant.id}: ${error.message}`,
						);
						// Continue with empty currentImageIds - will treat as no images
					}

					// Get desired variant image URLs
					const desiredImageUrls =
						variant.images && Array.isArray(variant.images)
							? variant.images.map((img: any) => img.url).filter(Boolean)
							: [];

					// Convert desired URLs to IDs
					const desiredImageIds = desiredImageUrls
						.map((url: string) => {
							const id = imageUrlToIdMap.get(url);
							if (!id) {
								logger.warn(
									`[PRODUCT-UPDATE] Could not resolve image ID for URL: ${url.substring(0, 50)}...`,
								);
							}
							return id;
						})
						.filter(Boolean) as string[];

					logger.info(
						`[PRODUCT-UPDATE] Variant ${updatedVariant.id}: ${desiredImageUrls.length} desired URLs -> ${desiredImageIds.length} IDs, ${currentImageIds.length} current IDs`,
					);
					if (desiredImageIds.length > 0) {
						logger.info(
							`[PRODUCT-UPDATE] Desired variant image IDs: ${desiredImageIds.join(', ')}`,
						);
					}

					// Get all product image IDs
					const allProductImageIds = Array.from(imageUrlToIdMap.values());

					// IMPORTANT: Medusa's variant images logic:
					// - Images with NO pivot entries = "general" images → shown on ALL variants
					// - Images WITH pivot entries = "variant-specific" → shown only on associated variants
					//
					// To properly control which images a variant has, ALL product images must be
					// "variant-specific" (have at least one pivot entry somewhere).
					//
					// Strategy for single/few variant products:
					// 1. First, add ALL product images to this variant (makes them all "variant-specific")
					// 2. Then remove the ones we don't want on this variant
					// This ensures no images remain as "general" images.

					// Check if there are any "general" images (images not in any pivot entry)
					// These are images that would be added to ALL variants automatically
					const unwantedImageIds = allProductImageIds.filter(
						id => !desiredImageIds.includes(id),
					);

					// If we have unwanted images and they're currently showing (general images),
					// we need to first add ALL images to make them variant-specific, then remove unwanted
					const hasUnwantedGeneralImages =
						unwantedImageIds.length > 0 &&
						currentImageIds.length === allProductImageIds.length;

					if (hasUnwantedGeneralImages) {
						logger.info(
							`[PRODUCT-UPDATE] Variant ${updatedVariant.id}: Converting ${allProductImageIds.length} general images to variant-specific`,
						);

						try {
							// Step 1: Add ALL product images to make them variant-specific
							await batchVariantImagesWorkflow(req.scope).run({
								input: {
									variant_id: updatedVariant.id,
									add: allProductImageIds,
									remove: [],
								},
							});

							// Step 2: Remove the unwanted images
							await batchVariantImagesWorkflow(req.scope).run({
								input: {
									variant_id: updatedVariant.id,
									add: [],
									remove: unwantedImageIds,
								},
							});

							logger.info(
								`[PRODUCT-UPDATE] ✅ Variant ${updatedVariant.id}: Added ${allProductImageIds.length}, removed ${unwantedImageIds.length} → ${desiredImageIds.length} final`,
							);
						} catch (error: any) {
							logger.error(
								`[PRODUCT-UPDATE] ❌ Failed to update variant ${updatedVariant.id} images: ${error.message}`,
							);
						}
					} else {
						// Normal case: images are already variant-specific, do regular add/remove
						const imagesToAdd = desiredImageIds.filter(
							(id: string) => !currentImageIds.includes(id),
						);
						const imagesToRemove = currentImageIds.filter(
							(id: string) => !desiredImageIds.includes(id),
						);

						logger.info(
							`[PRODUCT-UPDATE] Variant ${updatedVariant.id}: ${imagesToAdd.length} to add, ${imagesToRemove.length} to remove`,
						);

						if (imagesToAdd.length > 0 || imagesToRemove.length > 0) {
							try {
								await batchVariantImagesWorkflow(req.scope).run({
									input: {
										variant_id: updatedVariant.id,
										add: imagesToAdd,
										remove: imagesToRemove,
									},
								});
								logger.info(
									`[PRODUCT-UPDATE] ✅ Updated variant ${updatedVariant.id} images: +${imagesToAdd.length} -${imagesToRemove.length}`,
								);
							} catch (error: any) {
								logger.error(
									`[PRODUCT-UPDATE] ❌ Failed to update variant ${updatedVariant.id} images: ${error.message}`,
								);
							}
						}
					}

					// Always store desired state for response (trust frontend)
					const responseImages = desiredImageIds
						.map(imgId => {
							for (const [url, id] of imageUrlToIdMap.entries()) {
								if (id === imgId) return { id: imgId, url };
							}
							return null;
						})
						.filter(Boolean) as Array<{ id: string; url: string }>;

					updatedVariantImagesMap.set(updatedVariant.id, responseImages);
				}
			}
		}

		// Fetch updated product for response using query.graph (handles all linked relations)
		const finalResult = await query.graph({
			entity: 'product',
			fields: [
				'id',
				'title',
				'subtitle',
				'handle',
				'status',
				'description',
				'discountable',
				'thumbnail',
				'metadata',
				'images.id',
				'images.url',
				'images.variants.id', // Critical: enables variant image filtering
				'tags.id',
				'tags.value',
				'categories.id',
				'categories.name',
				'sales_channels.id',
				'sales_channels.name',
				'type.id',
				'type.value',
				'shipping_profile.id',
				'shipping_profile.name',
				'collection.id',
				'collection.title',
				'variants.id',
				'variants.title',
				'variants.sku',
				'variants.manage_inventory',
				'variants.allow_backorder',
				'variants.prices.*',
				'variants.images.id',
				'variants.images.url',
				'variants.options.id',
				'variants.options.value',
				'options.id',
				'options.title',
				'options.values.id',
				'options.values.value',
			],
			filters: { id },
		});

		const finalProduct = Array.isArray(finalResult?.data)
			? finalResult.data[0]
			: updatedProduct;

		// Filter variant images to only include images specifically associated with each variant
		if (finalProduct?.variants && finalProduct?.images) {
			const imageVariantMap = new Map<string, string[]>();
			for (const image of finalProduct.images as any[]) {
				const variantIds = (image.variants || []).map((v: any) => v.id);
				imageVariantMap.set(image.id, variantIds);
			}

			for (const variant of finalProduct.variants) {
				const variantImages: any[] = [];
				for (const image of finalProduct.images) {
					const associatedVariants = imageVariantMap.get(image.id) || [];
					if (associatedVariants.includes(variant.id)) {
						variantImages.push({ id: image.id, url: image.url });
					}
				}
				variant.images = variantImages;
			}
		}

		// Handle sales channel linking separately (requires separate workflow)
		if (sales_channel_ids !== undefined) {
			// Get current sales channels
			const salesChannelResult = await query.graph({
				entity: 'product',
				fields: ['id', 'sales_channels.id'],
				filters: { id },
			});

			const currentProduct = Array.isArray(salesChannelResult?.data)
				? salesChannelResult.data[0]
				: null;
			const currentChannelIds =
				currentProduct?.sales_channels?.map((sc: any) => sc.id) || [];

			const newChannelIds = Array.isArray(sales_channel_ids)
				? sales_channel_ids
				: [];

			// Remove from channels not in new list
			for (const channelId of currentChannelIds) {
				if (!newChannelIds.includes(channelId)) {
					await linkProductsToSalesChannelWorkflow(req.scope).run({
						input: {
							id: channelId,
							remove: [id],
						},
					});
					logger.info(
						`[PRODUCT-UPDATE] Removed product ${id} from sales channel ${channelId}`,
					);
				}
			}

			// Add to new channels
			for (const channelId of newChannelIds) {
				if (!currentChannelIds.includes(channelId)) {
					await linkProductsToSalesChannelWorkflow(req.scope).run({
						input: {
							id: channelId,
							add: [id],
						},
					});
					logger.info(
						`[PRODUCT-UPDATE] Added product ${id} to sales channel ${channelId}`,
					);
				}
			}
		}

		logger.info(`[PRODUCT-UPDATE] Product updated: ${id}`);

		res.json({
			product: finalProduct || updatedProduct,
		});
	} catch (error) {
		logger.error('[PRODUCT-UPDATE] Error updating product:', error);
		res.status(500).json({
			error: 'Failed to update product',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};
