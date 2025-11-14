// busbasisberlin/src/api/admin/products/bulk-update/route.ts
// Admin API route for bulk product updates (sales channel and status)

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import {
	ContainerRegistrationKeys,
	ProductStatus,
} from '@medusajs/framework/utils';
import {
	batchProductsWorkflow,
	linkProductsToSalesChannelWorkflow,
} from '@medusajs/medusa/core-flows';

interface BulkUpdateRequest {
	product_ids: string[];
	status?: 'published' | 'draft';
	sales_channel_id?: string;
	sales_channel_action?: 'add' | 'remove' | 'replace';
}

export const POST = async (
	req: MedusaRequest<BulkUpdateRequest>,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		const { product_ids, status, sales_channel_id, sales_channel_action } =
			req.body;

		if (
			!product_ids ||
			!Array.isArray(product_ids) ||
			product_ids.length === 0
		) {
			res.status(400).json({
				error: 'Validation error',
				message: 'product_ids array is required and must not be empty',
			});
			return;
		}

		// Prepare batch update array
		const updateArray: Array<{ id: string; status?: ProductStatus }> = [];

		// Add status updates if provided
		if (status) {
			product_ids.forEach(productId => {
				updateArray.push({
					id: productId,
					status: status as ProductStatus,
				});
			});
		}

		// Perform batch product updates if status is provided
		if (updateArray.length > 0) {
			const { result } = await batchProductsWorkflow(req.scope).run({
				input: {
					update: updateArray,
				},
			});

			logger.info(
				`[BULK-UPDATE] Updated status for ${updateArray.length} products`,
			);
		}

		// Handle sales channel updates
		if (sales_channel_id && sales_channel_action) {
			const query = req.scope.resolve('query');

			if (sales_channel_action === 'add') {
				// Add products to sales channel
				await linkProductsToSalesChannelWorkflow(req.scope).run({
					input: {
						id: sales_channel_id,
						add: product_ids,
					},
				});
				logger.info(
					`[BULK-UPDATE] Added ${product_ids.length} products to sales channel ${sales_channel_id}`,
				);
			} else if (sales_channel_action === 'remove') {
				// Remove products from sales channel
				await linkProductsToSalesChannelWorkflow(req.scope).run({
					input: {
						id: sales_channel_id,
						remove: product_ids,
					},
				});
				logger.info(
					`[BULK-UPDATE] Removed ${product_ids.length} products from sales channel ${sales_channel_id}`,
				);
			} else if (sales_channel_action === 'replace') {
				// Replace all sales channels with the new one
				// First, get all current sales channels for these products
				const productsResult = await query.graph({
					entity: 'product',
					fields: ['id', 'sales_channels.id'],
					filters: {
						id: product_ids,
					},
				});

				const products = productsResult?.data || [];
				const allSalesChannelIds = new Set<string>();
				if (Array.isArray(products)) {
					products.forEach((product: any) => {
						if (product.sales_channels) {
							product.sales_channels.forEach((sc: any) => {
								allSalesChannelIds.add(sc.id);
							});
						}
					});
				}

				// Remove from all current sales channels
				for (const scId of allSalesChannelIds) {
					await linkProductsToSalesChannelWorkflow(req.scope).run({
						input: {
							id: scId,
							remove: product_ids,
						},
					});
				}

				// Add to new sales channel
				await linkProductsToSalesChannelWorkflow(req.scope).run({
					input: {
						id: sales_channel_id,
						add: product_ids,
					},
				});

				logger.info(
					`[BULK-UPDATE] Replaced sales channels for ${product_ids.length} products with ${sales_channel_id}`,
				);
			}
		}

		res.json({
			success: true,
			message: `Successfully updated ${product_ids.length} product(s)`,
			updated_count: product_ids.length,
		});
	} catch (error) {
		logger.error('[BULK-UPDATE] Error updating products:', error);
		res.status(500).json({
			error: 'Failed to update products',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};
