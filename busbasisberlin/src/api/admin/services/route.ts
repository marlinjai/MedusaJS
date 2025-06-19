/**
 * route.ts
 * Admin API routes for services
 * Handles GET (list) and POST (create) operations
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

import { SERVICE_MODULE } from '../../../modules/service';
import { Service } from '../../../modules/service/models/service';
import ServiceService from '../../../modules/service/service';

// GET /admin/services - List all services
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const serviceService: ServiceService = req.scope.resolve(SERVICE_MODULE);

  try {
    const { limit = 50, offset = 0, category, is_active, is_featured } = req.query;

    // Build filters
    const filters: any = {};
    if (category) filters.category = category;
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (is_featured !== undefined) filters.is_featured = is_featured === 'true';

    const services = await serviceService.listServices({
      where: filters,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      services,
      count: services.length,
    });
  } catch (error) {
    console.error('Error listing services:', error);
    res.status(500).json({
      error: 'Failed to list services',
      message: error.message,
    });
  }
};

// POST /admin/services - Create new service
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const serviceService: ServiceService = req.scope.resolve(SERVICE_MODULE);

  try {
    const serviceData = req.body as Partial<Service>;

    // Validate required fields
    if (!serviceData.title) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Service title is required',
      });
    }

    // Generate handle if not provided
    if (!serviceData.handle) {
      serviceData.handle = serviceData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    const service = await serviceService.createServices(serviceData);

    res.status(201).json({
      service,
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      error: 'Failed to create service',
      message: error.message,
    });
  }
};
