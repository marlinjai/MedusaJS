/**
 * [id]/route.ts
 * Admin API routes for individual manual customer operations
 * Handles get, update, and delete operations for specific manual customers
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { MANUAL_CUSTOMER_MODULE } from '../../../../modules/manual-customer';
import ManualCustomerService from '../../../../modules/manual-customer/service';

// GET /admin/manual-customers/[id] - Get specific manual customer
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
	const manualCustomerService: ManualCustomerService = req.scope.resolve(
		MANUAL_CUSTOMER_MODULE,
	);
	const { id } = req.params;

	try {
		const customers = await manualCustomerService.listManualCustomers({});
		const customer = customers.find(c => c.id === id);

		if (!customer) {
			return res.status(404).json({
				error: 'Manual customer not found',
				message: `Manual customer with ID ${id} does not exist`,
			});
		}

		res.json({
			customer,
		});
	} catch (error) {
		console.error('Error retrieving manual customer:', error);
		res.status(500).json({
			error: 'Failed to retrieve manual customer',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};

// PUT /admin/manual-customers/[id] - Update specific manual customer
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
	const manualCustomerService: ManualCustomerService = req.scope.resolve(
		MANUAL_CUSTOMER_MODULE,
	);
	const { id } = req.params;

	try {
		const updateData = req.body as any;

		// Check if customer exists
		const allCustomers = await manualCustomerService.listManualCustomers({});
		const existingCustomer = allCustomers.find(c => c.id === id);
		if (!existingCustomer) {
			return res.status(404).json({
				error: 'Manual customer not found',
				message: `Manual customer with ID ${id} does not exist`,
			});
		}

		const customer =
			await manualCustomerService.updateCustomerWithContactTracking(
				id,
				updateData,
			);

		res.json({
			customer,
			message: 'Manual customer updated successfully',
		});
	} catch (error) {
		console.error('Error updating manual customer:', error);
		res.status(500).json({
			error: 'Failed to update manual customer',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};

// DELETE /admin/manual-customers/[id] - Delete specific manual customer
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
	const manualCustomerService: ManualCustomerService = req.scope.resolve(
		MANUAL_CUSTOMER_MODULE,
	);
	const { id } = req.params;

	try {
		// Check if customer exists
		const allCustomers = await manualCustomerService.listManualCustomers({});
		const existingCustomer = allCustomers.find(c => c.id === id);
		if (!existingCustomer) {
			return res.status(404).json({
				error: 'Manual customer not found',
				message: `Manual customer with ID ${id} does not exist`,
			});
		}

		await manualCustomerService.deleteManualCustomers([id]);

		res.json({
			message: 'Manual customer deleted successfully',
		});
	} catch (error) {
		console.error('Error deleting manual customer:', error);
		res.status(500).json({
			error: 'Failed to delete manual customer',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};
