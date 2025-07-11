/**
 * route.ts
 * Admin API route for fetching grouped product-supplier relationships
 * GET /admin/products/[id]/suppliers/grouped
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SUPPLIER_MODULE } from '../../../../../../modules/supplier';
import SupplierModuleService from '../../../../../../modules/supplier/service';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);
  const { id: productId } = req.params;

  try {
    // Use the new grouped method from the enhanced service
    const groupedSuppliers = await supplierService.getGroupedSuppliersForProduct(productId);

    res.json({
      groups: groupedSuppliers,
      count: groupedSuppliers.length,
    });
  } catch (error) {
    console.error('Error fetching grouped suppliers:', error);
    res.status(500).json({
      error: 'Failed to fetch grouped suppliers',
      message: error.message,
    });
  }
};
