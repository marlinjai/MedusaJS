// busbasisberlin/src/api/admin/products/create/route.ts
// Admin API route to create a new product

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import {
	ContainerRegistrationKeys,
	Modules,
} from '@medusajs/framework/utils';
import { createProductsWorkflow } from '@medusajs/medusa/core-flows';

export const POST = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const {
			title,
			subtitle,
			handle,
			description,
			status = 'draft',
			discountable = true,
			type_id,
			collection_id,
			category_ids = [],
			tags = [],
			shipping_profile_id,
			sales_channel_ids = [],
			variants = [],
			has_variants = false,
			options = [],
			images = [],
		} = req.body;

		// Validate required fields
		if (!title) {
			res.status(400).json({
				error: 'Validation error',
				message: 'Title is required',
			});
			return;
		}

		// Generate handle from title if not provided
		const productHandle =
			handle ||
			title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '');

		// Prepare product data
		const productData: any = {
			title,
			handle: productHandle,
			description: description || null,
			status,
			discountable,
			metadata: {},
		};

		// Add subtitle if provided
		if (subtitle) {
			productData.subtitle = subtitle;
		}

		// Add images if provided
		if (images && images.length > 0) {
			productData.images = images.map((img: any) => ({
				url: img.url,
			}));
		}

		// Add optional fields
		if (type_id) {
			productData.type_id = type_id;
		}

		if (collection_id) {
			productData.collection_id = collection_id;
		}

		if (shipping_profile_id) {
			productData.shipping_profile_id = shipping_profile_id;
		}

		// Convert category_ids to correct format for workflow: categories: [{id: string}]
		if (category_ids && category_ids.length > 0) {
			productData.categories = category_ids.map(catId => ({ id: catId }));
		}

		// Handle tags - convert tag values to tag IDs, then to correct format for workflow
		let tagObjects: Array<{ id: string }> = [];
		if (tags && tags.length > 0) {
			const productModuleService = req.scope.resolve(Modules.PRODUCT);
			const tagIds: string[] = [];

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
					logger.info(`[PRODUCT-CREATE] Created new tag: ${tagValue}`);
				}

				tagIds.push(tagId);
			}

			// Convert to workflow format: tags: [{id: string}]
			tagObjects = tagIds.map(tagId => ({ id: tagId }));
		}

		if (tagObjects.length > 0) {
			productData.tags = tagObjects;
		}

		// Prepare product options if has_variants is true
		if (has_variants && options && options.length > 0) {
			productData.options = options.map((option: any) => ({
				title: option.title,
				values: option.values || [],
			}));
		}

		// Prepare variants
		let variantData: any[] = [];

		if (has_variants && options && options.length > 0) {
			// Generate variants from options (only enabled ones)
			const enabledVariants = variants.filter(
				(v: any) => v.enabled !== false,
			);
			variantData = enabledVariants.map((variant: any) => {
				// Map option values to variant options
				// Each variant should have options matching the product options structure
				const variantOptions: any[] = [];
				if (variant.option_values && variant.option_values.length > 0) {
					options.forEach((option: any, optionIndex: number) => {
						const value = variant.option_values[optionIndex];
						if (value && option.values.includes(value)) {
							variantOptions.push({
								option_id: option.title, // Medusa will match by title during creation
								value: value,
							});
						}
					});
				}

				return {
					title: variant.title || title,
					sku: variant.sku || undefined,
					manage_inventory: variant.manage_inventory || false,
					allow_backorder: variant.allow_backorder || false,
					metadata: {
						with_inventory_set: variant.with_inventory_set || false,
					},
					options: variantOptions,
					prices: [
						...(variant.price_eur
							? [
									{
										currency_code: 'eur',
										amount: Math.round((variant.price_eur || 0) * 100),
									},
								]
							: []),
						...(variant.price_europe
							? [
									{
										currency_code: 'eur',
										amount: Math.round((variant.price_europe || 0) * 100),
									},
								]
							: []),
					],
				};
			});
		} else if (variants && variants.length > 0) {
			// Manual variants mode
			variantData = variants.map((variant: any) => ({
				title: variant.title || title,
				sku: variant.sku || undefined,
				manage_inventory: variant.manage_inventory || false,
				allow_backorder: variant.allow_backorder || false,
				metadata: {
					with_inventory_set: variant.with_inventory_set || false,
				},
				prices: [
					...(variant.price_eur
						? [
								{
									currency_code: 'eur',
									amount: Math.round((variant.price_eur || 0) * 100),
								},
							]
						: []),
					...(variant.price_europe
						? [
								{
									currency_code: 'eur',
									amount: Math.round((variant.price_europe || 0) * 100),
								},
							]
						: []),
				],
			}));
		} else {
			// No variants - create default variant
			variantData = [
				{
					title: title,
					manage_inventory: false,
					allow_backorder: false,
					prices: [],
				},
			];
		}

		if (variantData.length > 0) {
			productData.variants = variantData;
		}

		// Create product using workflow
		const { result } = await createProductsWorkflow(req.scope).run({
			input: {
				products: [productData],
			},
		});

		const createdProduct = result[0];

		// Categories are already linked via workflow (categories: [{id}])
		// No need for separate workflow call

		// Link to sales channels if provided
		if (sales_channel_ids && sales_channel_ids.length > 0) {
			const { linkProductsToSalesChannelWorkflow } =
				await import('@medusajs/medusa/core-flows');
			for (const channelId of sales_channel_ids) {
				await linkProductsToSalesChannelWorkflow(req.scope).run({
					input: {
						id: channelId,
						add: [createdProduct.id],
					},
				});
			}
		}

		logger.info(`[PRODUCT-CREATE] Product created: ${createdProduct.id}`);

		res.json({
			product: createdProduct,
		});
	} catch (error) {
		logger.error('[PRODUCT-CREATE] Error creating product:', error);
		res.status(500).json({
			error: 'Failed to create product',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};

