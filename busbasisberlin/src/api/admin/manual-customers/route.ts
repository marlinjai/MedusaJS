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
    const { search, customer_type, status, source, limit = '20', offset = '0' } = req.query;

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    let customers;
    let totalCount = 0;

    // If search term is provided, use search functionality
    if (search) {
      const searchResults = await manualCustomerService.searchCustomers(search as string);
      totalCount = searchResults.length;
      customers = searchResults.slice(offsetNum, offsetNum + limitNum);
    } else {
      // Build filter object
      const filters: any = {};

      if (customer_type) filters.customer_type = customer_type;
      if (status) filters.status = status;
      if (source) filters.source = source;

      // Get total count for pagination
      const allCustomers = await manualCustomerService.listManualCustomers(filters);
      totalCount = allCustomers.length;

      // Apply pagination
      customers = allCustomers.slice(offsetNum, offsetNum + limitNum);
    }

    // Get statistics (these are global stats, not filtered)
    const stats = await manualCustomerService.getStatistics();

    res.json({
      customers,
      stats,
      count: customers.length,
      total: totalCount,
      limit: limitNum,
      offset: offsetNum,
      has_more: offsetNum + limitNum < totalCount,
    });
  } catch (error) {
    console.error('Error fetching manual customers:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Kunden' });
  }
};

// POST /admin/manual-customers - Create a new manual customer
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const manualCustomerService: ManualCustomerService = req.scope.resolve(MANUAL_CUSTOMER_MODULE);

  try {
    const customerData = req.body as any;

    // Basic validation
    if (!customerData.first_name && !customerData.last_name && !customerData.company && !customerData.email) {
      return res.status(400).json({
        error: 'Invalid customer data',
        message: 'At least one of first_name, last_name, company, or email must be provided',
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
