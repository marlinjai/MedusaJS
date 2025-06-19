/**
 * route.ts
 * Admin API routes for supplier management
 * Uses the auto-generated service methods from MedusaService factory
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SUPPLIER_MODULE } from '../../../modules/supplier';
import { Supplier } from '../../../modules/supplier/models/supplier';
import SupplierModuleService from '../../../modules/supplier/service';

// GET /admin/suppliers - List all suppliers using listAndCountSuppliers
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);

  try {
    // Parse query parameters for pagination and filtering
    const { limit = 10, offset = 0, search, status, active } = req.query;

    // Build filters object for the service
    const filters: any = {};

    if (search) {
      // Use $or operator for searching across multiple fields
      filters.$or = [
        { company: { $ilike: `%${search}%` } },
        { supplier_number: { $ilike: `%${search}%` } },
        { email: { $ilike: `%${search}%` } },
        { first_name: { $ilike: `%${search}%` } },
        { last_name: { $ilike: `%${search}%` } },
      ];
    }

    if (status) {
      filters.status = status;
    }

    if (active !== undefined) {
      filters.active = active === 'true';
    }

    // Use the auto-generated listAndCountSuppliers method
    const [suppliers, count] = await supplierService.listAndCountSuppliers(filters, {
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      order: { created_at: 'desc' },
    });

    res.json({
      suppliers,
      count,
      offset: parseInt(offset as string),
      limit: parseInt(limit as string),
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
    const supplier = await supplierService.createSuppliers(supplierData as any);

    res.status(201).json({
      supplier,
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      error: 'Failed to create supplier',
      message: error.message,
    });
  }
};
