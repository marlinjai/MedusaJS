// busbasisberlin/src/api/admin/product-types/route.ts
// Admin API route to list all product types

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	// #region agent log
	const startTime = Date.now();
	fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'product-types/route.ts:8',message:'GET entry',data:{hasCookie:!!req.headers.cookie,hasAuth:!!req.headers.authorization,url:req.url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
	// #endregion

	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'product-types/route.ts:14',message:'Before query resolve',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
		// #endregion

		const query = req.scope.resolve('query');

		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'product-types/route.ts:16',message:'After query resolve',data:{hasQuery:!!query},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
		// #endregion

		const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
		const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

		// Query all product types using query.graph
		const result = await query.graph({
			entity: 'product_type',
			fields: ['id', 'value', 'created_at', 'updated_at'],
			filters: {},
		});

		const productTypes = Array.isArray(result?.data) ? result.data : [];

		// #region agent log
		const duration = Date.now() - startTime;
		fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'product-types/route.ts:28',message:'Success',data:{count:productTypes?.length||0,duration},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
		// #endregion

		res.json({
			product_types: productTypes || [],
			count: productTypes?.length || 0,
			limit,
			offset,
		});
	} catch (error) {
		// #region agent log
		const duration = Date.now() - startTime;
		fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'product-types/route.ts:36',message:'Error caught',data:{error:error instanceof Error?error.message:'Unknown',stack:error instanceof Error?error.stack:'',duration},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
		// #endregion

		logger.error('[PRODUCT-TYPES] Error fetching product types:', error);
		res.status(500).json({
			error: 'Failed to fetch product types',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};

