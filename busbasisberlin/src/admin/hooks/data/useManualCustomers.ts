/**
 * useManualCustomers.ts
 * React Query hooks for manual customer data fetching
 * Provides consistent data fetching patterns for manual customer management
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ManualCustomer } from '../../../modules/manual-customer/models/manual-customer';

// Types for API responses
type ManualCustomersResponse = {
	customers: ManualCustomer[];
	count: number;
	offset: number;
	limit: number;
	total: number;
};

type ManualCustomerResponse = {
	customer: ManualCustomer;
};

type ManualCustomersParams = {
	search?: string;
	customer_type?: string;
	status?: string;
	source?: string;
	limit?: number;
	offset?: number;
	sort_by?: string;
	sort_direction?: 'asc' | 'desc';
	[key: string]: any; // For column filters (filter_*)
};

/**
 * Hook to fetch list of manual customers with optional filtering and pagination
 * @param params - Query parameters for filtering, pagination, and sorting
 * @returns React Query result with manual customers data
 */
export function useManualCustomers(params?: ManualCustomersParams) {
	return useQuery({
		queryKey: ['manual-customers', params],
		queryFn: async () => {
			const queryParams = new URLSearchParams();

			// Add pagination parameters
			if (params?.limit) queryParams.append('limit', params.limit.toString());
			if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());

			// Add filter parameters
			if (params?.search) queryParams.append('search', params.search);
			if (params?.customer_type) queryParams.append('customer_type', params.customer_type);
			if (params?.status) queryParams.append('status', params.status);
			if (params?.source) queryParams.append('source', params.source);

			// Add sorting parameters
			if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
			if (params?.sort_direction) queryParams.append('sort_direction', params.sort_direction);

			// Add column filters
			if (params) {
				Object.entries(params).forEach(([key, value]) => {
					if (key.startsWith('filter_') && value) {
						queryParams.append(key, value.toString());
					}
				});
			}

			const res = await fetch(`/admin/manual-customers?${queryParams.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				throw new Error('Failed to fetch manual customers');
			}

			return res.json() as Promise<ManualCustomersResponse>;
		},
		staleTime: 30000,
		placeholderData: previousData => previousData,
	});
}

/**
 * Hook to fetch a single manual customer by ID
 * @param id - Manual customer ID
 * @returns React Query result with manual customer data
 */
export function useManualCustomer(id: string | null) {
	return useQuery({
		queryKey: ['manual-customer', id],
		queryFn: async () => {
			if (!id) throw new Error('Manual customer ID is required');

			const res = await fetch(`/admin/manual-customers/${id}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404) {
					throw new Error('Manual customer not found');
				}
				throw new Error('Failed to fetch manual customer');
			}

			return res.json() as Promise<ManualCustomerResponse>;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}

/**
 * Hook to create a new manual customer
 * @returns Mutation function for creating manual customers
 */
export function useCreateManualCustomer() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: Partial<ManualCustomer>) => {
			const res = await fetch('/admin/manual-customers', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(data),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to create manual customer');
			}

			return res.json() as Promise<ManualCustomerResponse>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['manual-customers'] });
		},
	});
}

/**
 * Hook to update an existing manual customer
 * @returns Mutation function for updating manual customers
 */
export function useUpdateManualCustomer() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<ManualCustomer> }) => {
			const res = await fetch(`/admin/manual-customers/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(data),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to update manual customer');
			}

			return res.json() as Promise<ManualCustomerResponse>;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['manual-customers'] });
			queryClient.invalidateQueries({ queryKey: ['manual-customer', variables.id] });
		},
	});
}

/**
 * Hook to delete a manual customer
 * @returns Mutation function for deleting manual customers
 */
export function useDeleteManualCustomer() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/admin/manual-customers/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to delete manual customer');
			}

			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['manual-customers'] });
		},
	});
}

