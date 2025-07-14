/**
 * route.ts
 * Admin API routes for manual customers
 * Handles list and create operations for manual customers
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { MANUAL_CUSTOMER_MODULE } from '../../../modules/manual-customer';
import ManualCustomerService from '../../../modules/manual-customer/service';

// GET /admin/manual-customers - List all manual customers with filtering, sorting, and search
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const manualCustomerService: ManualCustomerService = req.scope.resolve(MANUAL_CUSTOMER_MODULE);

  try {
    const {
      search,
      customer_type,
      status,
      source,
      limit = '20',
      offset = '0',
      sort_by,
      sort_direction = 'asc',
    } = req.query;

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    // Extract column filters (parameters starting with 'filter_')
    const columnFilters: Record<string, string> = {};
    Object.entries(req.query).forEach(([key, value]) => {
      if (key.startsWith('filter_') && value) {
        const filterKey = key.replace('filter_', '');
        // Handle query parameter types properly - convert to string
        if (Array.isArray(value)) {
          columnFilters[filterKey] = String(value[0]);
        } else if (typeof value === 'string') {
          columnFilters[filterKey] = value;
        } else {
          columnFilters[filterKey] = String(value);
        }
      }
    });

    let customers;
    let totalCount = 0;

    // If search term is provided, use search functionality
    if (search) {
      const searchResults = await manualCustomerService.searchCustomers(search as string);
      customers = searchResults;
      totalCount = searchResults.length;
    } else {
      // Build filter object
      const filters: any = {};

      if (customer_type) filters.customer_type = customer_type;
      if (status) filters.status = status;
      if (source) filters.source = source;

      // Get all customers with basic filters
      customers = await manualCustomerService.listManualCustomers(filters);
      totalCount = customers.length;
    }

    // Apply column filters
    if (Object.keys(columnFilters).length > 0) {
      customers = customers.filter((customer: any) => {
        return Object.entries(columnFilters).every(([key, value]) => {
          const filterValue = String(value).toLowerCase();

          switch (key) {
            case 'customer_number':
              return String(customer.customer_number || '')
                .toLowerCase()
                .includes(filterValue);
            case 'name':
              const displayName =
                customer.company || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unbekannt';
              return displayName.toLowerCase().includes(filterValue);
            case 'contact':
              const contacts = [customer.email, customer.phone, customer.mobile].filter(Boolean).join(' ');
              return contacts.toLowerCase().includes(filterValue);
            case 'address':
              const addressParts = [customer.street, customer.postal_code, customer.city].filter(Boolean).join(' ');
              return addressParts.toLowerCase().includes(filterValue);
            case 'customer_type':
              return customer.customer_type === String(value);
            case 'status':
              return customer.status === String(value);
            default:
              return true;
          }
        });
      });
      totalCount = customers.length;
    }

    // Apply sorting
    if (sort_by) {
      customers.sort((a: any, b: any) => {
        let aValue, bValue;

        switch (sort_by) {
          case 'customer_number':
            aValue = parseInt(a.customer_number) || 0;
            bValue = parseInt(b.customer_number) || 0;
            break;
          case 'name':
            aValue = a.company || `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Unbekannt';
            bValue = b.company || `${b.first_name || ''} ${b.last_name || ''}`.trim() || 'Unbekannt';
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
            break;
          case 'customer_type':
            aValue = a.customer_type || '';
            bValue = b.customer_type || '';
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'total_purchases':
            aValue = a.total_purchases || 0;
            bValue = b.total_purchases || 0;
            break;
          case 'total_spent':
            aValue = a.total_spent || 0;
            bValue = b.total_spent || 0;
            break;
          case 'created_at':
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
            break;
          default:
            aValue = a[sort_by] || '';
            bValue = b[sort_by] || '';
        }

        if (aValue < bValue) return sort_direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort_direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination after filtering and sorting
    const paginatedCustomers = customers.slice(offsetNum, offsetNum + limitNum);

    // Get statistics (these are global stats, not filtered)
    const stats = await manualCustomerService.getStatistics();

    res.json({
      customers: paginatedCustomers,
      stats,
      count: paginatedCustomers.length,
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
