// src/app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

type RevalidateRequest = {
	tags: string[];
	entityId: string;
	timestamp: string;
};

/**
 * API endpoint for cache invalidation triggered by Medusa backend events
 * This endpoint is called by Medusa subscribers when data changes
 */
export async function POST(request: NextRequest) {
	try {
		// Verify authorization
		const authHeader = request.headers.get('authorization');
		const expectedAuth = `Bearer ${
			process.env.REVALIDATE_SECRET || 'supersecret'
		}`;

		if (authHeader !== expectedAuth) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body: RevalidateRequest = await request.json();
		const { tags, entityId, timestamp } = body;

		if (!tags || !Array.isArray(tags) || tags.length === 0) {
			return NextResponse.json(
				{ error: 'Invalid tags provided' },
				{ status: 400 },
			);
		}

		console.log(
			`[CACHE-REVALIDATION] Invalidating cache for entity ${entityId}, tags: ${tags.join(
				', ',
			)}`,
		);

		// Get all possible cache IDs (we need to invalidate for all users)
		// For now, we'll use a wildcard approach by revalidating common cache patterns
		const cachePatterns = ['products', 'categories', 'collections', 'regions'];

		// Revalidate cache tags
		for (const pattern of cachePatterns) {
			if (tags.includes(pattern)) {
				try {
					// Revalidate the base tag
					revalidateTag(pattern);

					// Also revalidate user-specific cache tags if we had a way to get all cache IDs
					// For now, this will revalidate the default cache
					console.log(`[CACHE-REVALIDATION] Revalidated tag: ${pattern}`);
				} catch (error) {
					console.error(
						`[CACHE-REVALIDATION] Failed to revalidate tag ${pattern}:`,
						error,
					);
				}
			}
		}

		return NextResponse.json({
			success: true,
			message: `Cache invalidated for tags: ${tags.join(', ')}`,
			entityId,
			timestamp,
			revalidatedAt: new Date().toISOString(),
		});
	} catch (error) {
		console.error(
			'[CACHE-REVALIDATION] Error processing revalidation request:',
			error,
		);

		return NextResponse.json(
			{
				error: 'Internal server error',
				details:
					process.env.NODE_ENV === 'development'
						? error instanceof Error
							? error.message
							: String(error)
						: undefined,
			},
			{ status: 500 },
		);
	}
}

/**
 * GET endpoint for manual cache clearing (for testing/debugging)
 */
export async function GET(request: NextRequest) {
	try {
		// Verify authorization
		const authHeader = request.headers.get('authorization');
		const expectedAuth = `Bearer ${
			process.env.REVALIDATE_SECRET || 'supersecret'
		}`;

		if (authHeader !== expectedAuth) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get tags from query parameters
		const { searchParams } = new URL(request.url);
		const tagsParam = searchParams.get('tags');
		const tags = tagsParam ? tagsParam.split(',') : ['products', 'categories'];

		console.log(
			`[CACHE-REVALIDATION] Manual cache invalidation for tags: ${tags.join(
				', ',
			)}`,
		);

		// Revalidate specified tags
		for (const tag of tags) {
			try {
				revalidateTag(tag.trim());
				console.log(`[CACHE-REVALIDATION] Manually revalidated tag: ${tag}`);
			} catch (error) {
				console.error(
					`[CACHE-REVALIDATION] Failed to manually revalidate tag ${tag}:`,
					error,
				);
			}
		}

		return NextResponse.json({
			success: true,
			message: `Manual cache invalidation completed for tags: ${tags.join(
				', ',
			)}`,
			revalidatedAt: new Date().toISOString(),
		});
	} catch (error) {
		console.error(
			'[CACHE-REVALIDATION] Error processing manual revalidation:',
			error,
		);

		return NextResponse.json(
			{
				error: 'Internal server error',
				details:
					process.env.NODE_ENV === 'development'
						? error instanceof Error
							? error.message
							: String(error)
						: undefined,
			},
			{ status: 500 },
		);
	}
}
