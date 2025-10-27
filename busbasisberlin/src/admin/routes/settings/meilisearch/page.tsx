import { defineRouteConfig } from '@medusajs/admin-sdk';
import { Badge, Button, Container, Heading, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { sdk } from '../../../lib/sdk';

const MeilisearchPage = () => {
	const { mutate, isPending } = useMutation({
		mutationFn: () =>
			sdk.client.fetch('/admin/meilisearch/sync', {
				method: 'POST',
			}),
		onSuccess: () => {
			toast.success('Successfully triggered data sync to Meilisearch');
			refetchFacets();
			refetchIndexes();
		},
		onError: err => {
			console.error(err);
			toast.error('Failed to sync data to Meilisearch');
		},
	});

	const { data: facetsData, refetch: refetchFacets } = useQuery({
		queryKey: ['meilisearch-facets'],
		queryFn: async () => {
			const res = (await sdk.client.fetch(
				'/admin/meilisearch/facets',
			)) as Response;
			return (await res.json()) as any;
		},
		retry: true,
	});

	const { data: indexesData, refetch: refetchIndexes } = useQuery({
		queryKey: ['meilisearch-indexes'],
		queryFn: async () => {
			const res = (await sdk.client.fetch(
				'/admin/meilisearch/indexes',
			)) as Response;
			return (await res.json()) as any;
		},
		retry: true,
	});

	const handleSync = () => {
		mutate();
	};

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Meilisearch Management</Heading>
			</div>

			{/* Sync Section */}
			<div className="px-6 py-8">
				<div className="mb-4">
					<Heading level="h3" className="mb-2">
						Data Synchronization
					</Heading>
					<Text className="text-ui-fg-subtle mb-4">
						Sync products with enhanced category paths, availability, and
						pricing data to Meilisearch for advanced search capabilities.
					</Text>
				</div>
				<Button variant="primary" onClick={handleSync} isLoading={isPending}>
					Sync Data to Meilisearch
				</Button>
			</div>

			{/* Indexes List */}
			{indexesData?.success && (
				<div className="px-6 py-8">
					<div className="mb-4">
						<Heading level="h3" className="mb-2">
							Available Indexes
						</Heading>
						<Text className="text-ui-fg-subtle mb-4">
							Currently configured Meilisearch indexes and their metadata.
						</Text>
					</div>

					<div className="space-y-3">
						{indexesData.data.map((index: any) => (
							<div key={index.uid} className="p-4 border rounded-lg">
								<div className="flex items-center justify-between">
									<div>
										<Text className="font-semibold">{index.uid}</Text>
										<Text className="text-sm text-ui-fg-subtle">
											Primary Key: {index.primaryKey}
										</Text>
									</div>
									<Badge color="green" className="text-xs">
										Active
									</Badge>
								</div>
								<div className="mt-2 flex gap-4 text-xs text-ui-fg-subtle">
									<span>
										Created: {new Date(index.createdAt).toLocaleDateString()}
									</span>
									<span>
										Updated: {new Date(index.updatedAt).toLocaleDateString()}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Index Statistics */}
			{facetsData?.success && (
				<div className="px-6 py-8">
					<div className="mb-4">
						<Heading level="h3" className="mb-2">
							Index Statistics
						</Heading>
						<Text className="text-ui-fg-subtle mb-4">
							Current search index statistics and available facets for
							filtering.
						</Text>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
						<div className="p-4 border rounded-lg">
							<Text className="text-sm font-medium text-ui-fg-subtle">
								Total Products
							</Text>
							<Text className="text-2xl font-bold">
								{String(facetsData.data.totalProducts)}
							</Text>
						</div>

						<div className="p-4 border rounded-lg">
							<Text className="text-sm font-medium text-ui-fg-subtle">
								Categories
							</Text>
							<Text className="text-2xl font-bold">
								{String(
									Object.keys(
										facetsData.data.facets['hierarchical_categories.lvl0'] ||
											{},
									).length,
								)}
							</Text>
						</div>

						<div className="p-4 border rounded-lg">
							<Text className="text-sm font-medium text-ui-fg-subtle">
								Available Products
							</Text>
							<Text className="text-2xl font-bold">
								{String(facetsData.data.facets.is_available?.true || 0)}
							</Text>
						</div>
					</div>

					{/* Category Facets */}
					{facetsData.data.facets['hierarchical_categories.lvl0'] && (
						<div className="mb-6">
							<Heading level="h3" className="mb-3">
								Category Distribution
							</Heading>
							<div className="flex flex-wrap gap-2">
								{Object.entries(
									facetsData.data.facets['hierarchical_categories.lvl0'],
								)
									.sort(([, a], [, b]) => (b as number) - (a as number))
									.slice(0, 10)
									.map(([category, count]) => (
										<Badge key={category} className="text-xs">
											{String(category)} ({String(count)})
										</Badge>
									))}
							</div>
						</div>
					)}

					{/* Tags */}
					{facetsData.data.facets.tags && (
						<div className="mb-6">
							<Heading level="h3" className="mb-3">
								Popular Tags
							</Heading>
							<div className="flex flex-wrap gap-2">
								{Object.entries(facetsData.data.facets.tags)
									.sort(([, a], [, b]) => (b as number) - (a as number))
									.slice(0, 15)
									.map(([tag, count]) => (
										<Badge key={tag} className="text-xs">
											{String(tag)} ({String(count)})
										</Badge>
									))}
							</div>
						</div>
					)}
				</div>
			)}
		</Container>
	);
};

export const config = defineRouteConfig({
	label: 'Meilisearch',
});

export default MeilisearchPage;
