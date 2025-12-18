/**
 * route.ts
 * Admin API routes for individual services
 * Handles GET (retrieve), PUT (update), and DELETE operations
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SERVICE_MODULE } from '../../../../modules/service';
import { Service } from '../../../../modules/service/models/service';
import ServiceService from '../../../../modules/service/service';

// GET /admin/services/[id] - Retrieve a specific service
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
	const serviceService: ServiceService = req.scope.resolve(SERVICE_MODULE);

	try {
		const { id } = req.params;

		const service = await serviceService.retrieveService(id);

		res.json({
			service,
		});
	} catch (error) {
		console.error('Error retrieving service:', error);
		res.status(500).json({
			error: 'Failed to retrieve service',
			message: error.message,
		});
	}
};

// PUT /admin/services/[id] - Update a specific service
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
	const serviceService: ServiceService = req.scope.resolve(SERVICE_MODULE);

	try {
		const { id } = req.params;
		const serviceData = req.body as Partial<Service>;

		// #region agent log
		const fs = require('fs');
		fs.appendFileSync(
			'/Users/marlin.pohl/software development/MedusaJS/.cursor/debug.log',
			JSON.stringify({
				location: 'route.ts:39',
				message: 'PUT request received',
				data: {
					id,
					serviceData,
					hasTitle: 'title' in serviceData,
					bodyKeys: Object.keys(serviceData),
				},
				timestamp: Date.now(),
				sessionId: 'debug-session',
				runId: 'post-fix',
				hypothesisId: 'A,D',
			}) + '\n',
		);
		// #endregion

		// Validate title only if it's being explicitly set to empty/null
		// Allow partial updates without requiring title field
		if (
			'title' in serviceData &&
			(!serviceData.title || serviceData.title.trim() === '')
		) {
			// #region agent log
			fs.appendFileSync(
				'/Users/marlin.pohl/software development/MedusaJS/.cursor/debug.log',
				JSON.stringify({
					location: 'route.ts:47',
					message: 'Validation failed - empty title provided',
					data: { id, serviceData },
					timestamp: Date.now(),
					sessionId: 'debug-session',
					runId: 'post-fix',
					hypothesisId: 'A',
				}) + '\n',
			);
			// #endregion

			return res.status(400).json({
				error: 'Validation error',
				message: 'Service title cannot be empty',
			});
		}

		// Add the ID to the service data
		const updateData = { ...serviceData, id };

		const updatedServices = await serviceService.updateServices([updateData]);

		if (!updatedServices || updatedServices.length === 0) {
			return res.status(404).json({
				error: 'Service not found',
				message: `Service with ID ${id} does not exist`,
			});
		}

		// #region agent log
		fs.appendFileSync(
			'/Users/marlin.pohl/software development/MedusaJS/.cursor/debug.log',
			JSON.stringify({
				location: 'route.ts:67',
				message: 'Update successful',
				data: { id, updatedService: updatedServices[0] },
				timestamp: Date.now(),
				sessionId: 'debug-session',
				hypothesisId: 'A,D',
			}) + '\n',
		);
		// #endregion

		res.json({
			service: updatedServices[0],
		});
	} catch (error) {
		// #region agent log
		const fs = require('fs');
		fs.appendFileSync(
			'/Users/marlin.pohl/software development/MedusaJS/.cursor/debug.log',
			JSON.stringify({
				location: 'route.ts:75',
				message: 'PUT request error',
				data: { id: req.params.id, error: error.message, stack: error.stack },
				timestamp: Date.now(),
				sessionId: 'debug-session',
				hypothesisId: 'D',
			}) + '\n',
		);
		// #endregion

		console.error('Error updating service:', error);
		res.status(500).json({
			error: 'Failed to update service',
			message: error.message,
		});
	}
};

// DELETE /admin/services/[id] - Delete a specific service
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
	const serviceService: ServiceService = req.scope.resolve(SERVICE_MODULE);

	try {
		const { id } = req.params;

		await serviceService.deleteServices(id);

		res.status(204).send();
	} catch (error) {
		console.error('Error deleting service:', error);
		res.status(500).json({
			error: 'Failed to delete service',
			message: error.message,
		});
	}
};
