/**
 * route.ts
 * Admin API route for reordering product-supplier relationships within a supplier group
 * POST /admin/products/[id]/suppliers/[supplierId]/reorder
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SUPPLIER_MODULE } from '../../../../../../../modules/supplier';
import SupplierModuleService from '../../../../../../../modules/supplier/service';

interface ReorderRequest {
  relationshipIds: string[];
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);
  const { id: productId, supplierId } = req.params;

  try {
    const { relationshipIds } = req.body as ReorderRequest;

    if (!relationshipIds || !Array.isArray(relationshipIds)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'relationshipIds must be an array',
      });
    }

    // Use the enhanced service method to reorder relationships
    await supplierService.reorderSupplierRelationships(productId, supplierId, relationshipIds);

    res.json({
      success: true,
      message: 'Relationships reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering supplier relationships:', error);
    res.status(500).json({
      error: 'Failed to reorder relationships',
      message: error.message,
    });
  }
};
