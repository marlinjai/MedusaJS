// busbasisberlin/src/api/admin/stores/[id]/route.ts
// Custom admin endpoint to update store metadata including announcement settings

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';
import { updateStoresWorkflow } from '@medusajs/medusa/core-flows';

interface UpdateStoreRequest {
	metadata?: Record<string, any>;
}

export const POST = async (
	req: MedusaRequest<UpdateStoreRequest>,
	res: MedusaResponse,
): Promise<void> => {
	try {
		const { id } = req.params;
		const { metadata } = req.body;

		if (!id) {
			res.status(400).json({
				error: 'Validation error',
				message: 'Store ID is required',
			});
			return;
		}

		// Get store service to fetch current store
		const storeModuleService = req.scope.resolve(Modules.STORE);

		// Fetch the current store to merge metadata
		const stores = await storeModuleService.listStores({ id: [id] });
		const store = stores[0];

		if (!store) {
			res.status(404).json({
				error: 'Not found',
				message: 'Store not found',
			});
			return;
		}

		// Merge existing metadata with new metadata to preserve other settings
		const updatedMetadata = {
			...(store.metadata || {}),
			...(metadata || {}),
		};

		// Update the store using workflow (consistent with seed script)
		await updateStoresWorkflow(req.scope).run({
			input: {
				selector: { id },
				update: {
					metadata: updatedMetadata,
				},
			},
		});

		// Fetch updated store to return
		const updatedStores = await storeModuleService.listStores({ id: [id] });
		const updatedStore = updatedStores[0];

		res.json({
			store: updatedStore,
		});
	} catch (error) {
		console.error('[STORE-UPDATE] Error updating store:', error);
		res.status(500).json({
			error: 'Failed to update store',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};

