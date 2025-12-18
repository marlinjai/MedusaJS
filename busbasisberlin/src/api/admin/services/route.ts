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
	// #region agent log
	const fs = require('fs');
	fs.appendFileSync('/Users/marlin.pohl/software development/MedusaJS/.cursor/debug.log', JSON.stringify({location:'route.ts:14',message:'GET /admin/services called',data:{query:req.query,hasServiceModule:!!SERVICE_MODULE},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})+'\\n');
	// #endregion

	let serviceService: ServiceService;
	try {
		serviceService = req.scope.resolve(SERVICE_MODULE);
		// #region agent log
		fs.appendFileSync('/Users/marlin.pohl/software development/MedusaJS/.cursor/debug.log', JSON.stringify({location:'route.ts:15',message:'Service module resolved',data:{hasService:!!serviceService,serviceType:typeof serviceService},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})+'\\n');
		// #endregion
	} catch (resolveError) {
		// #region agent log
		fs.appendFileSync('/Users/marlin.pohl/software development/MedusaJS/.cursor/debug.log', JSON.stringify({location:'route.ts:16',message:'Failed to resolve service module',data:{error:resolveError.message,stack:resolveError.stack},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})+'\\n');
		// #endregion
		return res.status(503).json({
			error: 'Service module unavailable',
			message: resolveError.message,
		});
	}

	try {
		const {
			limit = 50,
			offset = 0,
			category,
			is_active,
			is_featured,
		} = req.query;

		// Build filters
		const filters: any = {};
		if (category) filters.category = category;
		if (is_active !== undefined) filters.is_active = is_active === 'true';
		if (is_featured !== undefined) filters.is_featured = is_featured === 'true';

		// #region agent log
		fs.appendFileSync('/Users/marlin.pohl/software development/MedusaJS/.cursor/debug.log', JSON.stringify({location:'route.ts:32',message:'Calling listServices',data:{filters,limit,offset},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})+'\\n');
		// #endregion

		// Use the auto-generated listServices method
		const services = await serviceService.listServices(filters, {
			take: parseInt(limit as string),
			skip: parseInt(offset as string),
			order: { created_at: 'desc' },
		});

		// #region agent log
		fs.appendFileSync('/Users/marlin.pohl/software development/MedusaJS/.cursor/debug.log', JSON.stringify({location:'route.ts:38',message:'Services retrieved',data:{count:services.length,firstService:services[0]?{id:services[0].id,title:services[0].title}:null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})+'\\n');
		// #endregion

		res.json({
			services,
			count: services.length,
			offset: parseInt(offset as string),
			limit: parseInt(limit as string),
		});
	} catch (error) {
		// #region agent log
		fs.appendFileSync('/Users/marlin.pohl/software development/MedusaJS/.cursor/debug.log', JSON.stringify({location:'route.ts:45',message:'Error in GET handler',data:{error:error.message,stack:error.stack,name:error.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D'})+'\\n');
		// #endregion
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
		console.error('Error creating service:', error);
		res.status(500).json({
			error: 'Failed to create service',
			message: error.message,
		});
	}
};
