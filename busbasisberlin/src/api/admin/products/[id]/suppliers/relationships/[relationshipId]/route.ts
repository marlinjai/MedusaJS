/**
 * route.ts
 * Admin API route for managing individual product-supplier relationships
 * PUT /admin/products/[id]/suppliers/relationships/[relationshipId] - Update specific relationship
 * DELETE /admin/products/[id]/suppliers/relationships/[relationshipId] - Delete specific relationship
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SUPPLIER_MODULE } from '../../../../../../../modules/supplier';
import { ProductSupplier } from '../../../../../../../modules/supplier/models/product-supplier';
import SupplierModuleService from '../../../../../../../modules/supplier/service';

// PUT - Update a specific product-supplier relationship
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
	const supplierService: SupplierModuleService =
		req.scope.resolve(SUPPLIER_MODULE);
	const { id: productId, relationshipId } = req.params;

	try {
		const updateData = req.body as Partial<ProductSupplier>;

		// Update the specific relationship using the enhanced service method
		const updatedRelationship =
			await supplierService.updateProductSupplierRelationship(
				relationshipId,
				updateData,
			);

		res.json({
			relationship: updatedRelationship,
		});
	} catch (error) {
		console.error('Error updating product-supplier relationship:', error);

		if (error.message === 'Relationship not found') {
			return res.status(404).json({
				error: 'Relationship not found',
				message: 'The specified relationship does not exist',
			});
		}

		res.status(500).json({
			error: 'Failed to update relationship',
			message: error.message,
		});
	}
};

// DELETE - Delete a specific product-supplier relationship
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
	const supplierService: SupplierModuleService =
		req.scope.resolve(SUPPLIER_MODULE);
	const { id: productId, relationshipId } = req.params;

	try {
		// Delete the specific relationship using the enhanced service method
		await supplierService.deleteProductSupplierRelationship(relationshipId);

		res.status(204).send();
	} catch (error) {
		console.error('Error deleting product-supplier relationship:', error);
		res.status(500).json({
			error: 'Failed to delete relationship',
			message: error.message,
		});
	}
};
