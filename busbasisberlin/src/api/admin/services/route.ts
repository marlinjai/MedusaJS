/**
 * route.ts
 * Admin API routes for services
 * Handles GET (list) and POST (create) operations
 * Includes Zod validation for input validation and type safety
 */
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from 'zod';

import { SERVICE_MODULE } from '../../../modules/service';
import { Service } from '../../../modules/service/models/service';
import ServiceService from '../../../modules/service/service';

// Zod validation schemas
const listServicesSchema = z.object({
	limit: z.coerce.number().min(1).max(500).default(50),
	offset: z.coerce.number().min(0).default(0),
	category: z.string().optional(),
	is_active: z.enum(['true', 'false']).optional(),
	is_featured: z.enum(['true', 'false']).optional(),
});

const createServiceSchema = z.object({
	title: z.string().min(1, 'Service title is required'),
	description: z.string().optional(),
	short_description: z.string().optional(),
	category: z.string().optional(),
	service_type: z.string().optional(),
	base_price: z.number().min(0).optional(),
	hourly_rate: z.number().min(0).optional(),
	currency_code: z.string().default('EUR'),
	estimated_duration: z.number().min(0).optional(),
	is_active: z.boolean().default(true),
	is_featured: z.boolean().default(false),
	requires_vehicle: z.boolean().default(false),
	requires_diagnosis: z.boolean().default(false),
	requires_approval: z.boolean().default(false),
});

// GET /admin/services - List all services
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
	let serviceService: ServiceService;
	try {
		serviceService = req.scope.resolve(SERVICE_MODULE);
	} catch (resolveError) {
		console.error('[SERVICES] Failed to resolve service module:', resolveError);
		return res.status(503).json({
			error: 'Service module unavailable',
			message: resolveError.message,
		});
	}

	try {
		// Validate query parameters
		const params = listServicesSchema.parse(req.query);

		// Build filters from validated params
		const filters: any = {};
		if (params.category) filters.category = params.category;
		if (params.is_active !== undefined) filters.is_active = params.is_active === 'true';
		if (params.is_featured !== undefined) filters.is_featured = params.is_featured === 'true';

		console.log('[SERVICES] Fetching services with filters:', filters);

		// Use the auto-generated listServices method
		const services = await serviceService.listServices(filters, {
			take: params.limit,
			skip: params.offset,
			order: { created_at: 'desc' },
		});

		console.log('[SERVICES] Retrieved', services.length, 'services');

		res.json({
			services,
			count: services.length,
			offset: params.offset,
			limit: params.limit,
		});
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: 'Validation error',
				details: error.errors,
			});
		}

		console.error('[SERVICES] Error listing services:', error);
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
		// Validate request body with Zod
		const serviceData = createServiceSchema.parse(req.body);

		// Use the auto-generated createServices method, ensuring data is in an array
		const createdServices = await serviceService.createServices([
			serviceData as any,
		]);

		if (!createdServices || createdServices.length === 0) {
			return res.status(500).json({ error: 'Failed to create service' });
		}

		res.status(201).json({
			service: createdServices[0],
		});
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: 'Validation error',
				details: error.errors,
			});
		}

		console.error('Error creating service:', error);
		res.status(500).json({
			error: 'Failed to create service',
			message: error.message,
		});
	}
};
