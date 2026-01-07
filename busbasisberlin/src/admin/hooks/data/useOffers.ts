/**
 * useOffers.ts
 * React Query hooks for offer data fetching
 * Provides consistent data fetching patterns for offer management
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Offer } from '../../../modules/offer/models/offer';

// Types for API responses
type OffersResponse = {
	offers: Offer[];
	count: number;
	offset: number;
	limit: number;
	total: number;
};

type OfferResponse = {
	offer: Offer;
};

type OffersParams = {
	limit?: number;
	offset?: number;
	status?: string;
	customer_email?: string;
	created_by?: string;
	assigned_to?: string;
	created_after?: string;
	created_before?: string;
	valid_after?: string;
	valid_before?: string;
};

/**
 * Hook to fetch list of offers with optional filtering and pagination
 * @param params - Query parameters for filtering and pagination
 * @returns React Query result with offers data
 */
export function useOffers(params?: OffersParams) {
	return useQuery({
		queryKey: ['offers', params],
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
			if (params?.status) queryParams.append('status', params.status);
			if (params?.customer_email) queryParams.append('customer_email', params.customer_email);
			if (params?.created_by) queryParams.append('created_by', params.created_by);
			if (params?.assigned_to) queryParams.append('assigned_to', params.assigned_to);
			if (params?.created_after) queryParams.append('created_after', params.created_after);
			if (params?.created_before) queryParams.append('created_before', params.created_before);
			if (params?.valid_after) queryParams.append('valid_after', params.valid_after);
			if (params?.valid_before) queryParams.append('valid_before', params.valid_before);

			const res = await fetch(`/admin/offers?${queryParams.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				throw new Error('Failed to fetch offers');
			}

			return res.json() as Promise<OffersResponse>;
		},
		staleTime: 30000,
		placeholderData: previousData => previousData,
	});
}

/**
 * Hook to fetch a single offer by ID
 * @param id - Offer ID
 * @returns React Query result with offer data
 */
export function useOffer(id: string | null) {
	return useQuery({
		queryKey: ['offer', id],
		queryFn: async () => {
			if (!id) throw new Error('Offer ID is required');

			const res = await fetch(`/admin/offers/${id}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404) {
					throw new Error('Offer not found');
				}
				throw new Error('Failed to fetch offer');
			}

			return res.json() as Promise<OfferResponse>;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}

/**
 * Hook to create a new offer
 * @returns Mutation function for creating offers
 */
export function useCreateOffer() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: any) => {
			const res = await fetch('/admin/offers', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(data),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to create offer');
			}

			return res.json() as Promise<OfferResponse>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['offers'] });
		},
	});
}

/**
 * Hook to update an existing offer
 * @returns Mutation function for updating offers
 */
export function useUpdateOffer() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: any }) => {
			const res = await fetch(`/admin/offers/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(data),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to update offer');
			}

			return res.json() as Promise<OfferResponse>;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['offers'] });
			queryClient.invalidateQueries({ queryKey: ['offer', variables.id] });
		},
	});
}

/**
 * Hook to delete an offer
 * @returns Mutation function for deleting offers
 */
export function useDeleteOffer() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/admin/offers/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to delete offer');
			}

			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['offers'] });
		},
	});
}

