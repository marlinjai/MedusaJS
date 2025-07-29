// busbasisberlin/src/api/admin/manual-customers/matches/route.ts
// API endpoint for finding potential customer matches

import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import ManualCustomerService from '../../../../modules/manual-customer/service';

interface FindMatchesRequest {
	email?: string;
	first_name?: string;
	last_name?: string;
	phone?: string;
}

// Find potential matches for a core customer
export async function POST(req: MedusaRequest, res: MedusaResponse) {
	try {
		const { email, first_name, last_name, phone } =
			req.body as FindMatchesRequest;

		if (!email && !first_name && !last_name && !phone) {
			return res.status(400).json({
				message:
					'At least one search field (email, first_name, last_name, phone) is required',
			});
		}

		const manualCustomerService = req.scope.resolve(
			'manualCustomerService',
		) as ManualCustomerService;

		const potentialMatches = await manualCustomerService.findPotentialMatches({
			email,
			first_name,
			last_name,
			phone,
		});

		res.json({
			matches: potentialMatches,
			count: potentialMatches.length,
		});
	} catch (error) {
		console.error('Error finding potential matches:', error);
		res.status(500).json({
			message:
				error instanceof Error
					? error.message
					: 'Failed to find potential matches',
		});
	}
}
