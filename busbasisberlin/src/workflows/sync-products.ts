import {
	createWorkflow,
	WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { useQueryGraphStep } from '@medusajs/medusa/core-flows';
import { syncProductsStep, SyncProductsStepInput } from './steps/sync-products';

type SyncProductsWorkflowInput = {
	filters?: Record<string, unknown>;
	limit?: number;
	offset?: number;
};

export const syncProductsWorkflow = createWorkflow(
	'sync-products',
	({ filters, limit, offset }: SyncProductsWorkflowInput) => {
		const { data, metadata } = useQueryGraphStep({
			entity: 'product',
			fields: [
				'id',
				'title',
				'description',
				'handle',
				'thumbnail',
				'status',
				'created_at',
				'updated_at',
				'categories.id',
				'categories.name',
				'categories.handle',
				'categories.parent_category.name',
				'tags.id',
				'tags.value',
				'collection.id',
				'collection.title',
				'collection.handle',
				'variants.id',
				'variants.sku',
				'variants.title',
				'variants.manage_inventory',
				'variants.allow_backorder',
				'variants.prices.amount',
				'variants.prices.currency_code',
			],
			pagination: {
				take: limit,
				skip: offset,
			},
			filters: filters || {},
		});

		syncProductsStep({
			products: data,
		} as SyncProductsStepInput);

		return new WorkflowResponse({
			products: data,
			metadata,
		});
	},
);
