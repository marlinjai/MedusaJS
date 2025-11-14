// api/public/settings/route.ts
// Proxy route to backend /public/settings endpoint

import { NextRequest, NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL =
	process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
	process.env.MEDUSA_BACKEND_URL ||
	'http://localhost:9000';

export async function GET(request: NextRequest) {
	try {
		const response = await fetch(`${MEDUSA_BACKEND_URL}/public/settings`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
			// Cache for 1 minute to reduce backend load
			next: { revalidate: 60 },
		});

		if (!response.ok) {
			console.error(
				'[API-PROXY] Failed to fetch settings from backend:',
				response.status,
			);
			return NextResponse.json(
				{
					error: 'Failed to fetch settings',
				},
				{ status: response.status },
			);
		}

		const data = await response.json();
		return NextResponse.json(data, {
			status: 200,
			headers: {
				'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
			},
		});
	} catch (error) {
		console.error('[API-PROXY] Error proxying settings request:', error);
		return NextResponse.json(
			{
				error: 'Internal server error',
			},
			{ status: 500 },
		);
	}
}


