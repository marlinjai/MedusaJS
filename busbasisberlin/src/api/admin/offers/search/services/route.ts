/**
 * search/services/route.ts
 * API endpoint for searching services for offer creation
 * Uses the custom service module with enhanced search functionality
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

import { SERVICE_MODULE } from '../../../../../modules/service';
import ServiceService from '../../../../../modules/service/service';

interface SearchServicesQuery {
  q?: string;
  limit?: string;
  category?: string;
  service_type?: string;
  is_active?: string;
}

export async function GET(req: MedusaRequest<SearchServicesQuery>, res: MedusaResponse) {
  const serviceService: ServiceService = req.scope.resolve(SERVICE_MODULE);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    const { q = '', limit = '10', category, service_type, is_active } = req.query;
    const limitNum = parseInt(limit as string);

    let services: any[] = [];

    // If search query is provided, use the search method
    if (q && typeof q === 'string' && q.trim()) {
      services = await serviceService.searchServices(q.trim());
    } else {
      // Otherwise, use regular list with filters
      const filters: any = {};
      if (category) {
        filters.category = category;
      }
      if (service_type) {
        filters.service_type = service_type;
      }
      if (is_active !== undefined) {
        filters.is_active = is_active === 'true';
      }

      services = await serviceService.listServices(filters, {
        take: limitNum,
        skip: 0,
      });
    }

    // Limit results
    const limitedServices = services.slice(0, limitNum);

    // Format results for the frontend
    const formattedServices = limitedServices.map(service => ({
      id: service.id,
      title: service.title,
      name: service.title, // For compatibility
      description: service.description,
      short_description: service.short_description,
      category: service.category,
      service_type: service.service_type,
      base_price: service.base_price,
      hourly_rate: service.hourly_rate,
      currency_code: service.currency_code || 'EUR',
      is_active: service.is_active,
      // Additional fields for better display
      estimated_duration: service.estimated_duration,
      status: service.status,
      is_featured: service.is_featured,
    }));

    logger.info(`Service search completed: ${formattedServices.length} results for query "${q}"`);

    res.json({
      services: formattedServices,
      count: formattedServices.length,
      total: services.length,
    });
  } catch (error) {
    logger.error('Service search error:', error);
    res.status(500).json({
      error: 'Failed to search services',
      message: error.message,
    });
  }
}
