/**
 * api-utils.ts
 * Shared utilities for API routes
 */
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import type { Logger } from '@medusajs/framework/types';

/**
 * Standard error response format
 */
export type ErrorResponse = {
	error: string;
	message: string;
	details?: any;
	code?: string;
};

/**
 * Standard success response format for list endpoints
 */
export type ListResponse<T> = {
	data: T[];
	count: number;
	offset: number;
	limit: number;
	total?: number;
};

/**
 * Pagination parameters from query string
 */
export type PaginationParams = {
	limit: number;
	offset: number;
};

/**
 * Sorting parameters from query string
 */
export type SortParams = {
	sort_by?: string;
	sort_direction?: 'asc' | 'desc';
};

/**
 * Parse pagination parameters from request query
 */
export function parsePaginationParams(
	query: Record<string, any>,
	defaults: { limit?: number; offset?: number } = {},
): PaginationParams {
	const limit = query.limit
		? parseInt(query.limit as string, 10)
		: defaults.limit ?? 50;
	const offset = query.offset
		? parseInt(query.offset as string, 10)
		: defaults.offset ?? 0;

	return {
		limit: Math.max(1, Math.min(limit, 1000)), // Cap at 1000
		offset: Math.max(0, offset),
	};
}

/**
 * Parse sorting parameters from request query
 */
export function parseSortParams(query: Record<string, any>): SortParams {
	return {
		sort_by: query.sort_by as string | undefined,
		sort_direction: (query.sort_direction as 'asc' | 'desc') ?? 'asc',
	};
}

/**
 * Send a standardized error response
 */
export function sendErrorResponse(
	res: MedusaResponse,
	statusCode: number,
	error: string,
	message: string,
	details?: any,
	code?: string,
): void {
	res.status(statusCode).json({
		error,
		message,
		...(details && { details }),
		...(code && { code }),
	} as ErrorResponse);
}

/**
 * Send a standardized success response for single resource
 */
export function sendSuccessResponse<T>(
	res: MedusaResponse,
	data: T,
	statusCode: number = 200,
): void {
	res.status(statusCode).json(data);
}

/**
 * Send a standardized success response for list endpoints
 */
export function sendListResponse<T>(
	res: MedusaResponse,
	data: T[],
	pagination: PaginationParams,
	total?: number,
): void {
	res.json({
		data,
		count: data.length,
		offset: pagination.offset,
		limit: pagination.limit,
		...(total !== undefined && { total }),
	} as ListResponse<T>);
}

/**
 * Validate required parameters
 */
export function validateRequiredParams(
	params: Record<string, any>,
	required: string[],
): { valid: boolean; missing: string[] } {
	const missing = required.filter(
		key => params[key] === undefined || params[key] === null || params[key] === '',
	);
	return {
		valid: missing.length === 0,
		missing,
	};
}

/**
 * Handle async route with try-catch and standardized error responses
 */
export async function handleRoute<T = any>(
	handler: () => Promise<T>,
	logger?: Logger,
	context?: string,
): Promise<{ success: boolean; data?: T; error?: Error }> {
	try {
		const data = await handler();
		return { success: true, data };
	} catch (error) {
		if (logger && context) {
			logger.error(`[${context}] Error:`, error);
		}
		return {
			success: false,
			error: error instanceof Error ? error : new Error('Unknown error'),
		};
	}
}

/**
 * Parse filters from query string with prefix
 * Example: filter_status=active, filter_type=business -> { status: 'active', type: 'business' }
 */
export function parseFilters(
	query: Record<string, any>,
	prefix: string = 'filter_',
): Record<string, any> {
	const filters: Record<string, any> = {};

	for (const [key, value] of Object.entries(query)) {
		if (key.startsWith(prefix) && value) {
			const filterKey = key.substring(prefix.length);
			filters[filterKey] = value;
		}
	}

	return filters;
}

/**
 * Build query parameters string from object
 */
export function buildQueryParams(params: Record<string, any>): string {
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== '') {
			searchParams.append(key, String(value));
		}
	}

	return searchParams.toString();
}

/**
 * Sanitize search query (prevent SQL injection, trim whitespace, etc.)
 */
export function sanitizeSearchQuery(query: string | undefined): string | undefined {
	if (!query) return undefined;

	return query
		.trim()
		.replace(/[<>]/g, '') // Remove potential HTML/SQL injection characters
		.substring(0, 200); // Limit length
}

