// src/workflows/sync-categories.ts
import {
	createWorkflow,
	WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { useQueryGraphStep } from '@medusajs/medusa/core-flows';
import {
	syncCategoriesStep,
	SyncCategoriesStepInput,
} from './steps/sync-categories';

type SyncCategoriesWorkflowInput = {
	filters?: Record<string, unknown>;
	limit?: number;
	offset?: number;
};

export const syncCategoriesWorkflow = createWorkflow(
	'sync-categories',
	({ filters, limit, offset }: SyncCategoriesWorkflowInput) => {
		const { data, metadata } = useQueryGraphStep({
			entity: 'product_category',
			fields: [
				'id',
				'name',
				'description',
				'handle',
				'is_active',
				'is_internal',
				'parent_category_id',
				'parent_category.id',
				'parent_category.name',
				'parent_category.handle',
				'category_children.id',
				'category_children.name',
				'category_children.handle',
				'mpath',
				'rank',
				'created_at',
				'updated_at',
			],
			pagination: {
				take: limit,
				skip: offset,
			},
			filters: filters || {},
		});

		syncCategoriesStep({
			categories: data,
		} as SyncCategoriesStepInput);

		return new WorkflowResponse({
			categories: data,
			metadata,
		});
	},
);
