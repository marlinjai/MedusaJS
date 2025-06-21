/**
 * route.ts
 * Admin API routes for managing individual product-supplier relationships
 * Handles PUT (update relationship) and DELETE (unlink supplier)
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SUPPLIER_MODULE } from '../../../../../../modules/supplier';
import { ProductSupplier } from '../../../../../../modules/supplier/models/product-supplier';
import SupplierModuleService from '../../../../../../modules/supplier/service';

// PUT /admin/products/[id]/suppliers/[supplierId] - Update product-supplier relationship
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);
  const { id: productId, supplierId } = req.params;

  try {
    const updateData = req.body as Partial<ProductSupplier>;

    // Find the existing relationship
    const existingRelationships = await supplierService.listProductSuppliers({
      product_id: productId,
      supplier_id: supplierId,
    });

    if (existingRelationships.length === 0) {
      return res.status(404).json({
        error: 'Relationship not found',
        message: 'No relationship found between this product and supplier',
      });
    }

    const relationship = existingRelationships[0];

    // Update the relationship
    const updatedRelationships = await supplierService.updateProductSuppliers({
      id: relationship.id,
      ...updateData,
    });

    if (!updatedRelationships) {
      return res.status(404).json({
        error: 'Relationship not found',
        message: 'Failed to update relationship',
      });
    }

    // Get the supplier details for the response
    const supplier = await supplierService.retrieveSupplier(supplierId);

    res.json({
      relationship: {
        ...updatedRelationships,
        supplier,
      },
    });
  } catch (error) {
    console.error('Error updating product-supplier relationship:', error);
    res.status(500).json({
      error: 'Failed to update relationship',
      message: error.message,
    });
  }
};

// DELETE /admin/products/[id]/suppliers/[supplierId] - Unlink supplier from product
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);
  const { id: productId, supplierId } = req.params;

  try {
    // Find the existing relationship
    const existingRelationships = await supplierService.listProductSuppliers({
      product_id: productId,
      supplier_id: supplierId,
    });

    if (existingRelationships.length === 0) {
      return res.status(404).json({
        error: 'Relationship not found',
        message: 'No relationship found between this product and supplier',
      });
    }

    // Delete the relationship
    await supplierService.deleteProductSuppliers(existingRelationships[0].id);

    res.status(204).send();
  } catch (error) {
    console.error('Error unlinking supplier from product:', error);
    res.status(500).json({
      error: 'Failed to unlink supplier',
      message: error.message,
    });
  }
};
