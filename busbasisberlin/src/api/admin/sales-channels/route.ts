// busbasisberlin/src/api/admin/sales-channels/route.ts
// Admin API route to list all sales channels

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	// #region agent log
	const startTime = Date.now();
	fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sales-channels/route.ts:8',message:'GET entry',data:{hasCookie:!!req.headers.cookie,hasAuth:!!req.headers.authorization,url:req.url,method:req.method},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
	// #endregion

	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sales-channels/route.ts:14',message:'Before module resolve',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
		// #endregion

		const salesChannelModuleService = req.scope.resolve(Modules.SALES_CHANNEL);

		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sales-channels/route.ts:16',message:'After module resolve',data:{hasModule:!!salesChannelModuleService},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
		// #endregion

		const salesChannels = await salesChannelModuleService.listSalesChannels();

		// #region agent log
		const duration = Date.now() - startTime;
		fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sales-channels/route.ts:18',message:'Success',data:{count:salesChannels?.length||0,duration},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
		// #endregion

		res.json({
			sales_channels: salesChannels || [],
			count: salesChannels?.length || 0,
		});
	} catch (error) {
		// #region agent log
		const duration = Date.now() - startTime;
		fetch('http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sales-channels/route.ts:24',message:'Error caught',data:{error:error instanceof Error?error.message:'Unknown',stack:error instanceof Error?error.stack:'',duration},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
		// #endregion

		logger.error('[SALES-CHANNELS] Error fetching sales channels:', error);
		res.status(500).json({
			error: 'Failed to fetch sales channels',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};







