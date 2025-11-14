// busbasisberlin/src/api/admin/products/[id]/route.ts
// Admin API route to get and update an existing product

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { Modules } from '@medusajs/framework/utils';
import {
	updateProductsWorkflow,
	linkProductsToSalesChannelWorkflow,
} from '@medusajs/medusa/core-flows';

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

			// Fetch product with all relations
			const query = req.scope.resolve('query');
			const productResult = await query.graph({
				entity: 'product',
				fields: [
					'id',
					'title',
					'subtitle',
					'handle',
					'description',
					'status',
					'discountable',
					'thumbnail',
					'created_at',
					'updated_at',
					'type.id',
					'type.value',
					'categories.id',
					'categories.name',
					'collection.id',
					'collection.title',
					'sales_channels.id',
					'sales_channels.name',
					'tags.id',
					'tags.value',
					'shipping_profile.id',
					'shipping_profile.name',
					'variants.id',
					'variants.title',
					'variants.sku',
					'variants.enabled',
					'variants.inventory_quantity',
					'variants.prices.amount',
					'variants.prices.currency_code',
					'options.id',
					'options.title',
					'options.values.value',
					'images.url',
				],
				filters: { id },
			});

		const product = Array.isArray(productResult?.data)
			? productResult.data[0]
			: null;

		if (!product) {
			res.status(404).json({
				error: 'Not found',
				message: 'Product not found',
			});
			return;
		}

		logger.info(`[PRODUCT-GET] Product fetched: ${id}`);

		res.json({
			product,
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
	req: MedusaRequest,
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
			category_ids = [],
			tags = [],
			shipping_profile_id,
			sales_channel_ids = [],
			variants = [],
			has_variants = false,
			options = [],
			images = [],
		} = req.body;

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
		let categoryObjects: Array<{ id: string }> = [];
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
			updateData.images = images.map((img: any) => ({
				url: img.url,
			}));
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

		// Add tags in correct format: tags: [{id: string}]
		if (tagObjects.length > 0) {
			updateData.tags = tagObjects;
		} else if (tags !== undefined && (!Array.isArray(tags) || tags.length === 0)) {
			// Empty array means remove all tags
			updateData.tags = [];
		}

		// Add categories in correct format: categories: [{id: string}]
		if (categoryObjects.length > 0) {
			updateData.categories = categoryObjects;
		} else if (category_ids !== undefined && (!Array.isArray(category_ids) || category_ids.length === 0)) {
			// Empty array means remove all categories
			updateData.categories = [];
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
				if (variant.manage_inventory !== undefined) variantData.manage_inventory = variant.manage_inventory;
				if (variant.allow_backorder !== undefined) variantData.allow_backorder = variant.allow_backorder;
				if (variant.prices) variantData.prices = variant.prices;
				return variantData;
			});
		}

		// Update product using workflow with correct format
		const { result } = await updateProductsWorkflow(req.scope).run({
			input: {
				products: [updateData],
			},
		});

		const updatedProduct = result[0];

		// Fetch updated product with all relations for response
		const productResult = await query.graph({
			entity: 'product',
			fields: [
				'id',
				'title',
				'subtitle',
				'handle',
				'description',
				'status',
				'discountable',
				'created_at',
				'updated_at',
				'type.id',
				'type.value',
				'categories.id',
				'categories.name',
				'collection.id',
				'collection.title',
				'sales_channels.id',
				'sales_channels.name',
				'tags.id',
				'tags.value',
				'shipping_profile.id',
				'shipping_profile.name',
				'variants.id',
				'variants.sku',
			],
			filters: { id },
		});

		const finalProduct = Array.isArray(productResult?.data)
			? productResult.data[0]
			: updatedProduct;

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

			const newChannelIds = Array.isArray(sales_channel_ids) ? sales_channel_ids : [];

			// Remove from channels not in new list
			for (const channelId of currentChannelIds) {
				if (!newChannelIds.includes(channelId)) {
					await linkProductsToSalesChannelWorkflow(req.scope).run({
						input: {
							id: channelId,
							remove: [id],
						},
					});
					logger.info(`[PRODUCT-UPDATE] Removed product ${id} from sales channel ${channelId}`);
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
					logger.info(`[PRODUCT-UPDATE] Added product ${id} to sales channel ${channelId}`);
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

