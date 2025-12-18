/**
 * bulk-update/route.ts
 * Bulk update endpoint for services (status updates, price adjustments)
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SERVICE_MODULE } from '../../../../modules/service';
import ServiceService from '../../../../modules/service/service';

type BulkUpdateRequest = {
	service_ids: string[];
	updates: {
		status?: 'active' | 'inactive';
		is_active?: boolean;
		base_price?: number;
	};
	price_adjustments?: Array<{
		id: string;
		newPrice: number;
	}>;
};

export const POST = async (
	req: MedusaRequest<BulkUpdateRequest>,
	res: MedusaResponse,
) => {
	const serviceService: ServiceService = req.scope.resolve(SERVICE_MODULE);

	try {
		const { service_ids, updates, price_adjustments } = req.body;

		if (!service_ids || service_ids.length === 0) {
			return res.status(400).json({
				error: 'No service IDs provided',
			});
		}

		// Handle price adjustments
		if (price_adjustments && price_adjustments.length > 0) {
			for (const adjustment of price_adjustments) {
				await serviceService.updateServices({
					id: adjustment.id,
					base_price: adjustment.newPrice,
				});
			}
		}
		// Handle general updates (status, etc.)
		else if (updates) {
			for (const serviceId of service_ids) {
				await serviceService.updateServices({
					id: serviceId,
					...updates,
				});
			}
		}

		res.json({
			success: true,
			updated_count: service_ids.length,
		});
	} catch (error) {
		console.error('Error in bulk update:', error);
		res.status(500).json({
			error: 'Failed to update services',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};







