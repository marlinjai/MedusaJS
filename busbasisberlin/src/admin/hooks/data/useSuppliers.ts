/**
 * useSuppliers.ts
 * React Query hooks for supplier data fetching
 * Provides consistent data fetching patterns for supplier management
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Supplier } from '../../../modules/supplier/models/supplier';

// Types for API responses
type SuppliersResponse = {
	suppliers: Supplier[];
	stats: {
		total: number;
		active: number;
		inactive: number;
		withContacts: number;
		withAddresses: number;
		withVatId: number;
		withBankInfo: number;
	};
	count: number;
	offset: number;
	limit: number;
};

type SupplierResponse = {
	supplier: Supplier;
};

type SuppliersParams = {
	search?: string;
	limit?: number;
	offset?: number;
	sort_by?: string;
	sort_direction?: 'asc' | 'desc';
	withDetails?: boolean;
};

/**
 * Hook to fetch list of suppliers with optional filtering and pagination
 * @param params - Query parameters for filtering, pagination, and sorting
 * @returns React Query result with suppliers data
 */
export function useSuppliers(params?: SuppliersParams) {
	return useQuery({
		queryKey: ['suppliers', params],
		queryFn: async () => {
			const queryParams = new URLSearchParams();

			// Add withDetails for optimized endpoint
			if (params?.withDetails !== false) {
				queryParams.append('withDetails', 'true');
			}

			// Add search parameter
			if (params?.search) {
				queryParams.append('search', params.search);
			}

			// Add pagination parameters
			if (params?.limit) {
				queryParams.append('limit', params.limit.toString());
			}
			if (params?.offset !== undefined) {
				queryParams.append('offset', params.offset.toString());
			}

			// Add sorting parameters
			if (params?.sort_by) {
				queryParams.append('sort_by', params.sort_by);
			}
			if (params?.sort_direction) {
				queryParams.append('sort_direction', params.sort_direction);
			}

			const res = await fetch(`/admin/suppliers?${queryParams.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				throw new Error('Failed to fetch suppliers');
			}

			return res.json() as Promise<SuppliersResponse>;
		},
		staleTime: 30000, // Cache for 30 seconds
		placeholderData: previousData => previousData, // Keep old data while refetching
	});
}

/**
 * Hook to fetch a single supplier by ID
 * @param id - Supplier ID
 * @returns React Query result with supplier data
 */
export function useSupplier(id: string | null) {
	return useQuery({
		queryKey: ['supplier', id],
		queryFn: async () => {
			if (!id) throw new Error('Supplier ID is required');

			const res = await fetch(`/admin/suppliers/${id}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404) {
					throw new Error('Supplier not found');
				}
				throw new Error('Failed to fetch supplier');
			}

			return res.json() as Promise<SupplierResponse>;
		},
		enabled: !!id, // Only run query if ID is provided
		staleTime: 30000,
	});
}

/**
 * Hook to create a new supplier
 * @returns Mutation function for creating suppliers
 */
export function useCreateSupplier() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: Partial<Supplier>) => {
			const res = await fetch('/admin/suppliers', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(data),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to create supplier');
			}

			return res.json() as Promise<SupplierResponse>;
		},
		onSuccess: () => {
			// Invalidate suppliers list to trigger refetch
			queryClient.invalidateQueries({ queryKey: ['suppliers'] });
		},
	});
}

/**
 * Hook to update an existing supplier
 * @returns Mutation function for updating suppliers
 */
export function useUpdateSupplier() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<Supplier>;
		}) => {
			const res = await fetch(`/admin/suppliers/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(data),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to update supplier');
			}

			return res.json() as Promise<SupplierResponse>;
		},
		onSuccess: (data, variables) => {
			// Invalidate both list and detail queries
			queryClient.invalidateQueries({ queryKey: ['suppliers'] });
			queryClient.invalidateQueries({ queryKey: ['supplier', variables.id] });
		},
	});
}

/**
 * Hook to delete a supplier
 * @returns Mutation function for deleting suppliers
 */
export function useDeleteSupplier() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/admin/suppliers/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to delete supplier');
			}

			return res.json();
		},
		onSuccess: () => {
			// Invalidate suppliers list to trigger refetch
			queryClient.invalidateQueries({ queryKey: ['suppliers'] });
		},
	});
}

