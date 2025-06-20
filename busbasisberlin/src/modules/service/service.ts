/**
 * service.ts
 * Service for managing services
 */
import { MedusaService } from '@medusajs/framework/utils';

import service, { Service } from './models/service';

/**
 * ServiceService extends the MedusaService factory,
 * which automatically generates CRUD operations for the service model.
 */
class ServiceService extends MedusaService({
  service,
}) {
  /**
   * Get active services
   * @return array of active services
   */
  async getActiveServices(): Promise<Service[]> {
    const [services] = await this.listAndCountServices({
      is_active: true,
      status: 'active',
    });
    return services;
  }

  /**
   * Get featured services
   * @return array of featured services
   */
  async getFeaturedServices(): Promise<Service[]> {
    const [services] = await this.listAndCountServices({
      is_active: true,
      is_featured: true,
      status: 'active',
    });
    return services;
  }

  /**
   * Get services by category
   * @param category - service category
   * @return array of services in category
   */
  async getServicesByCategory(category: string): Promise<Service[]> {
    const [services] = await this.listAndCountServices({
      category,
      is_active: true,
      status: 'active',
    });
    return services;
  }

  /**
   * Calculate service price based on duration
   * @param serviceId - service ID
   * @param durationMinutes - duration in minutes
   * @return calculated price in cents
   */
  async calculatePrice(serviceId: string, durationMinutes?: number): Promise<number> {
    const service = await this.retrieveService(serviceId);

    if (service.hourly_rate && durationMinutes) {
      // Calculate based on hourly rate
      const hours = durationMinutes / 60;
      return Math.round(service.hourly_rate * hours);
    }

    // Return base price or 0
    return service.base_price || 0;
  }
}

export default ServiceService;
