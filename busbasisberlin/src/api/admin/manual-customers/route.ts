/**
 * route.ts
 * Admin API routes for manual customers
 * Handles list and create operations for manual customers
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { MANUAL_CUSTOMER_MODULE } from '../../../modules/manual-customer';
import ManualCustomerService from '../../../modules/manual-customer/service';

// GET /admin/manual-customers - List all manual customers with filtering and search
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const manualCustomerService: ManualCustomerService = req.scope.resolve(MANUAL_CUSTOMER_MODULE);

  try {
    const { search, customer_type, status, source, limit, offset } = req.query;

    let customers;

    // If search term is provided, use search functionality
    if (search) {
      customers = await manualCustomerService.searchCustomers(search as string);
    } else {
      // Build filter object
      const filters: any = {};

      if (customer_type) filters.customer_type = customer_type;
      if (status) filters.status = status;
      if (source) filters.source = source;

      customers = await manualCustomerService.listManualCustomers(filters);
    }

    // Apply pagination if specified
    if (limit || offset) {
      const startIndex = offset ? parseInt(offset as string) : 0;
      const endIndex = limit ? startIndex + parseInt(limit as string) : customers.length;
      customers = customers.slice(startIndex, endIndex);
    }

    // Get statistics
    const stats = await manualCustomerService.getStatistics();

    res.json({
      customers,
      stats,
      count: customers.length,
    });
  } catch (error) {
    console.error('Error fetching manual customers:', error);
    res.status(500).json({
      error: 'Failed to fetch manual customers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// POST /admin/manual-customers - Create a new manual customer
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const manualCustomerService: ManualCustomerService = req.scope.resolve(MANUAL_CUSTOMER_MODULE);

  try {
    const customerData = req.body as any;

    // Basic validation
    if (!customerData.first_name && !customerData.last_name && !customerData.company) {
      return res.status(400).json({
        error: 'Invalid customer data',
        message: 'At least one of first_name, last_name, or company must be provided',
      });
    }

    const customer = await manualCustomerService.createManualCustomerWithNumber(customerData);

    res.status(201).json({
      customer,
      message: 'Manual customer created successfully',
    });
  } catch (error) {
    console.error('Error creating manual customer:', error);
    res.status(500).json({
      error: 'Failed to create manual customer',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
