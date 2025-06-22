/**
 * route.ts
 * Admin API routes for supplier management
 * Uses the auto-generated service methods from MedusaService factory
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SUPPLIER_MODULE } from '../../../modules/supplier';
import { Supplier } from '../../../modules/supplier/models/supplier';
import SupplierModuleService from '../../../modules/supplier/service';

// GET /admin/suppliers - List all suppliers using listSuppliers
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);

  try {
    // Use the simple listSuppliers method without complex filters
    const suppliers = await supplierService.listSuppliers();

    res.json({
      suppliers,
      count: suppliers.length,
      offset: 0,
      limit: suppliers.length,
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      error: 'Failed to fetch suppliers',
      message: error.message,
    });
  }
};

// POST /admin/suppliers - Create a new supplier using createSuppliers
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);

  try {
    const supplierData = req.body as Partial<Supplier>;

    // Validate required fields
    if (!supplierData.company) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Company name is required',
      });
    }

    // Use the auto-generated createSuppliers method
    const createdSuppliers = await supplierService.createSuppliers([supplierData as any]);

    if (!createdSuppliers || createdSuppliers.length === 0) {
      return res.status(500).json({ error: 'Supplier creation failed' });
    }

    res.status(201).json({
      supplier: createdSuppliers[0],
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      error: 'Failed to create supplier',
      message: error.message,
    });
  }
};
