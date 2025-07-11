/**
 * route.ts
 * Main admin API route for offer management
 * Handles GET (list offers) and POST (create offer) operations
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import OfferService from '../../../modules/offer/service';

// Module constant for service resolution
const OFFER_MODULE = 'offer';

// Type definitions for request/response
interface CreateOfferRequest {
  title: string;
  description?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  valid_until?: string;
  internal_notes?: string;
  customer_notes?: string;
  currency_code?: string;
  items?: Array<{
    product_id?: string;
    service_id?: string;
    item_type: 'product' | 'service';
    sku?: string;
    title: string;
    description?: string;
    quantity: number;
    unit?: string;
    unit_price: number;
    discount_percentage?: number;
    discount_amount?: number;
    tax_rate?: number;
    variant_title?: string;
    supplier_info?: string;
    lead_time?: number;
    custom_specifications?: string;
    delivery_notes?: string;
    item_group?: string;
  }>;
}

interface ListOffersQuery {
  limit?: number;
  offset?: number;
  status?: string;
  customer_email?: string;
  created_by?: string;
  assigned_to?: string;
  created_after?: string;
  created_before?: string;
  valid_after?: string;
  valid_before?: string;
}

/**
 * GET /admin/offers
 * List all offers with optional filtering
 */
export async function GET(req: MedusaRequest<ListOffersQuery>, res: MedusaResponse): Promise<void> {
  const offerService: OfferService = req.scope.resolve(OFFER_MODULE);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    const {
      limit = 20,
      offset = 0,
      status,
      customer_email,
      created_by,
      assigned_to,
      created_after,
      created_before,
      valid_after,
      valid_before,
    } = req.query;

    // Convert string parameters to numbers
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : 20;
    const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0;

    // Build filters
    const filters: any = {};

    if (status) filters.status = status;
    if (customer_email) filters.customer_email = customer_email;
    if (created_by) filters.created_by = created_by;
    if (assigned_to) filters.assigned_to = assigned_to;
    if (created_after) filters.created_at = { $gte: new Date(created_after as string) };
    if (created_before) {
      filters.created_at = { ...filters.created_at, $lte: new Date(created_before as string) };
    }
    if (valid_after) filters.valid_until = { $gte: new Date(valid_after as string) };
    if (valid_before) {
      filters.valid_until = { ...filters.valid_until, $lte: new Date(valid_before as string) };
    }

    // Get offers from service
    const offers = await offerService.listOffers(filters, {
      take: limitNum,
      skip: offsetNum,
    });

    // Get total count for pagination
    const totalCount = await offerService.listOffers(filters);

    // Get statistics for dashboard
    const stats = await offerService.getOfferStatistics();

    res.json({
      offers,
      count: totalCount.length,
      offset: offsetNum,
      limit: limitNum,
      stats,
    });
  } catch (error) {
    logger.error('Error listing offers:', error);
    res.status(500).json({
      error: 'Failed to list offers',
      message: error.message,
    });
  }
}

/**
 * POST /admin/offers
 * Create a new offer with items
 */
export async function POST(req: MedusaRequest<CreateOfferRequest>, res: MedusaResponse): Promise<void> {
  const offerService: OfferService = req.scope.resolve(OFFER_MODULE);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    const {
      title,
      description,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      valid_until,
      internal_notes,
      customer_notes,
      currency_code,
      items = [],
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Title is required',
      });
      return;
    }

    // Validate items
    if (items.length === 0) {
      res.status(400).json({
        error: 'Validation error',
        message: 'At least one item is required',
      });
      return;
    }

    for (const [index, item] of items.entries()) {
      if (!item.title || !item.title.trim()) {
        res.status(400).json({
          error: 'Validation error',
          message: `Item ${index + 1}: Title is required`,
        });
        return;
      }

      if (!item.item_type || !['product', 'service'].includes(item.item_type)) {
        res.status(400).json({
          error: 'Validation error',
          message: `Item ${index + 1}: item_type must be 'product' or 'service'`,
        });
        return;
      }

      if (!item.quantity || item.quantity <= 0) {
        res.status(400).json({
          error: 'Validation error',
          message: `Item ${index + 1}: quantity must be greater than 0`,
        });
        return;
      }

      if (!item.unit_price || item.unit_price < 0) {
        res.status(400).json({
          error: 'Validation error',
          message: `Item ${index + 1}: unit_price must be greater than or equal to 0`,
        });
        return;
      }
    }

    // Prepare offer data
    const offerData = {
      title: title.trim(),
      description: description?.trim(),
      customer_name: customer_name?.trim(),
      customer_email: customer_email?.trim(),
      customer_phone: customer_phone?.trim(),
      customer_address: customer_address?.trim(),
      valid_until: valid_until ? new Date(valid_until) : undefined,
      internal_notes: internal_notes?.trim(),
      customer_notes: customer_notes?.trim(),
      currency_code: currency_code || 'EUR',
      items,
    };

    // Create offer with items
    const newOffer = await offerService.createOfferWithItems(offerData);

    logger.info(`Offer created successfully: ${newOffer.offer_number}`);

    res.status(201).json({
      offer: newOffer,
      message: 'Offer created successfully',
    });
  } catch (error) {
    logger.error('Error creating offer:', error);
    res.status(500).json({
      error: 'Failed to create offer',
      message: error.message,
    });
  }
}
