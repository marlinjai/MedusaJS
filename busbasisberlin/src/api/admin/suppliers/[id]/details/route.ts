/**
 * route.ts
 * Admin API route for fetching supplier details with contacts and addresses
 * GET /admin/suppliers/[id]/details
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SUPPLIER_MODULE } from '../../../../../modules/supplier';
import SupplierModuleService from '../../../../../modules/supplier/service';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);
  const { id: supplierId } = req.params;

  try {
    // Get supplier with all related data (contacts and addresses)
    const supplierWithDetails = await supplierService.getSupplierWithDetails(supplierId);

    res.json({
      supplier: supplierWithDetails,
    });
  } catch (error) {
    console.error('Error fetching supplier details:', error);
    res.status(500).json({
      error: 'Failed to fetch supplier details',
      message: error.message,
    });
  }
};
