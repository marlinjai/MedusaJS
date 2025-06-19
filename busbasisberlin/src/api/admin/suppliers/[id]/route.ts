/**
 * route.ts
 * Admin API routes for individual supplier operations
 * Handles GET, PUT, and DELETE for specific suppliers
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SUPPLIER_MODULE } from '../../../../modules/supplier';
import { Supplier } from '../../../../modules/supplier/models/supplier';
import SupplierModuleService from '../../../../modules/supplier/service';

// GET /admin/suppliers/[id] - Get specific supplier
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);
  const { id } = req.params;

  try {
    // Use the auto-generated retrieveSupplier method
    const supplier = await supplierService.retrieveSupplier(id);

    if (!supplier) {
      return res.status(404).json({
        error: 'Supplier not found',
        message: `Supplier with ID ${id} does not exist`,
      });
    }

    res.json({
      supplier,
    });
  } catch (error) {
    console.error('Error retrieving supplier:', error);
    res.status(500).json({
      error: 'Failed to retrieve supplier',
      message: error.message,
    });
  }
};

// PUT /admin/suppliers/[id] - Update specific supplier
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);
  const { id } = req.params;

  try {
    const updateData = req.body as Partial<Supplier>;

    // Debug: Log the incoming data
    console.log('=== SUPPLIER UPDATE DEBUG ===');
    console.log('Supplier ID:', id);
    console.log('Request body:', JSON.stringify(updateData, null, 2));
    console.log('Data types check:');
    console.log('- status type:', typeof updateData.status, 'value:', updateData.status);
    console.log('===========================');

    // Validate required fields
    if (updateData.company !== undefined && !updateData.company) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Company name cannot be empty',
      });
    }

    // Clean up the data - convert empty strings to null for nullable fields
    const cleanedData = { ...updateData };

    // Handle nullable text fields - convert empty strings to null
    const nullableFields = [
      'supplier_number',
      'customer_number',
      'internal_key',
      'company_addition',
      'street',
      'postal_code',
      'city',
      'country',
      'phone_mobile',
      'phone_direct',
      'email',
      'website',
      'note',
      'vat_id',
      'contact_salutation',
      'contact_first_name',
      'contact_last_name',
      'contact_phone',
      'contact_mobile',
      'contact_fax',
      'contact_email',
      'contact_department',
      'bank_name',
      'bank_code',
      'account_number',
      'account_holder',
      'iban',
      'bic',
    ];

    nullableFields.forEach(field => {
      if (cleanedData[field] === '') {
        cleanedData[field] = null;
      }
    });

    // Add the id from params to the update data after validation
    const updatePayload = { id, ...cleanedData };

    console.log('Cleaned update payload:', JSON.stringify(updatePayload, null, 2));

    // Call the Medusa service factory update method - it expects an array
    const updatedSuppliers = await supplierService.updateSuppliers([updatePayload]);

    if (!updatedSuppliers || updatedSuppliers.length === 0) {
      return res.status(404).json({
        error: 'Supplier not found',
        message: `Supplier with ID ${id} does not exist`,
      });
    }

    console.log('Successfully updated supplier:', updatedSuppliers[0].id);

    res.json({
      supplier: updatedSuppliers[0],
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to update supplier',
      message: error.message,
    });
  }
};

// DELETE /admin/suppliers/[id] - Delete specific supplier
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierService: SupplierModuleService = req.scope.resolve(SUPPLIER_MODULE);
  const { id } = req.params;

  try {
    // Use the auto-generated deleteSuppliers method
    await supplierService.deleteSuppliers(id);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({
      error: 'Failed to delete supplier',
      message: error.message,
    });
  }
};
