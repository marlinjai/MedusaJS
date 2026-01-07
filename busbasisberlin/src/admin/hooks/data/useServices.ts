/**
 * useServices.ts
 * React Query hooks for service data fetching
 * Provides consistent data fetching patterns for service management
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Service } from '../../../modules/service/models/service';

// Types for API responses
type ServicesResponse = {
	services: Service[];
	count: number;
	offset: number;
	limit: number;
	total?: number;
};

type ServiceResponse = {
	service: Service;
};

type ServicesParams = {
	limit?: number;
	offset?: number;
	category?: string;
	is_active?: boolean;
	is_featured?: boolean;
};

/**
 * Hook to fetch list of services with optional filtering and pagination
 * @param params - Query parameters for filtering and pagination
 * @returns React Query result with services data
 */
export function useServices(params?: ServicesParams) {
	return useQuery({
		queryKey: ['services', params],
		queryFn: async () => {
			const queryParams = new URLSearchParams();

			// Add pagination parameters
			if (params?.limit) {
				queryParams.append('limit', params.limit.toString());
			}
			if (params?.offset !== undefined) {
				queryParams.append('offset', params.offset.toString());
			}

			// Add filter parameters
			if (params?.category) {
				queryParams.append('category', params.category);
			}
			if (params?.is_active !== undefined) {
				queryParams.append('is_active', params.is_active.toString());
			}
			if (params?.is_featured !== undefined) {
				queryParams.append('is_featured', params.is_featured.toString());
			}

			const res = await fetch(`/admin/services?${queryParams.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				throw new Error('Failed to fetch services');
			}

			return res.json() as Promise<ServicesResponse>;
		},
		staleTime: 30000,
		placeholderData: previousData => previousData,
	});
}

/**
 * Hook to fetch a single service by ID
 * @param id - Service ID
 * @returns React Query result with service data
 */
export function useService(id: string | null) {
	return useQuery({
		queryKey: ['service', id],
		queryFn: async () => {
			if (!id) throw new Error('Service ID is required');

			const res = await fetch(`/admin/services/${id}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404) {
					throw new Error('Service not found');
				}
				throw new Error('Failed to fetch service');
			}

			return res.json() as Promise<ServiceResponse>;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}

/**
 * Hook to create a new service
 * @returns Mutation function for creating services
 */
export function useCreateService() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: Partial<Service>) => {
			const res = await fetch('/admin/services', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(data),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to create service');
			}

			return res.json() as Promise<ServiceResponse>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['services'] });
		},
	});
}

/**
 * Hook to update an existing service
 * @returns Mutation function for updating services
 */
export function useUpdateService() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<Service>;
		}) => {
			const res = await fetch(`/admin/services/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(data),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to update service');
			}

			return res.json() as Promise<ServiceResponse>;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['services'] });
			queryClient.invalidateQueries({ queryKey: ['service', variables.id] });
		},
	});
}

/**
 * Hook to delete a service
 * @returns Mutation function for deleting services
 */
export function useDeleteService() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/admin/services/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to delete service');
			}

			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['services'] });
		},
	});
}

