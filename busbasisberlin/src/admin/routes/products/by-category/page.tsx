// busbasisberlin/src/admin/routes/products/by-category/page.tsx
// Admin page for managing products with category tree and advanced filters

import { defineRouteConfig } from '@medusajs/admin-sdk';
import {
	Button,
	Checkbox,
	Container,
	DataTableRowSelectionState,
	Heading,
	Input,
	Prompt,
	Select,
	Text,
	toast,
} from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	FolderTree,
	Plus,
	X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import ProductEditorModal from './components/ProductEditorModal';
import ProductTable from './components/ProductTable';

// Product type for table display (subset of full product data)
type ProductListItem = {
	id: string;
	title: string;
	handle: string;
	status: 'published' | 'draft';
	created_at?: string;
	updated_at?: string;
	sales_channels?: Array<{ id: string; name: string }>;
	categories?: Array<{ id: string; name: string }>;
	collection?: { id: string; title: string };
	variants?: Array<{ id: string; sku?: string; title?: string }>;
	shipping_profile?: { id: string; name: string; type: string };
};

type CategoryNode = {
	id: string;
	name: string;
	handle: string;
	parent_category_id: string | null;
	children: CategoryNode[];
};

type Collection = {
	id: string;
	title: string;
};

type SalesChannel = {
	id: string;
	name: string;
};

// Category Tree Component
function CategoryTree({
	categories,
	selectedCategories,
	onToggleCategory,
	expandedCategories,
	onToggleExpand,
	level = 0,
}: {
	categories: CategoryNode[];
	selectedCategories: Set<string>;
	onToggleCategory: (id: string) => void;
	expandedCategories: Set<string>;
	onToggleExpand: (id: string) => void;
	level?: number;
}) {
	return (
		<div className="space-y-1">
			{categories.map(category => {
				const hasChildren = category.children.length > 0;
				const isExpanded = expandedCategories.has(category.id);
				const isSelected = selectedCategories.has(category.id);

				return (
					<div key={category.id} className="flex flex-col">
						<div
							className="flex items-center gap-2 py-1 px-2 hover:bg-ui-bg-subtle rounded cursor-pointer"
							style={{ paddingLeft: `${level * 16 + 8}px` }}
						>
							{hasChildren && (
								<button
									onClick={e => {
										e.stopPropagation();
										onToggleExpand(category.id);
									}}
									className="p-0.5"
								>
									{isExpanded ? (
										<ChevronDown className="w-4 h-4" />
									) : (
										<ChevronRight className="w-4 h-4" />
									)}
								</button>
							)}
							{!hasChildren && <div className="w-5" />}
							<Checkbox
								checked={isSelected}
								onCheckedChange={() => onToggleCategory(category.id)}
							/>
							<Text
								size="small"
								onClick={() => onToggleCategory(category.id)}
								className="flex-1 cursor-pointer"
							>
								{category.name}
							</Text>
						</div>
						{hasChildren && isExpanded && (
							<CategoryTree
								categories={category.children}
								selectedCategories={selectedCategories}
								onToggleCategory={onToggleCategory}
								expandedCategories={expandedCategories}
								onToggleExpand={onToggleExpand}
								level={level + 1}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

export default function ProductsByCategoryPage() {
	const queryClient = useQueryClient();
	const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
		new Set(),
	);
	const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
		new Set(),
	);
	const [selectedSalesChannels, setSelectedSalesChannels] = useState<
		Set<string>
	>(new Set());
	const [selectedShippingProfiles, setSelectedShippingProfiles] = useState<
		Set<string>
	>(new Set());
	const [skuSearch, setSkuSearch] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	const [sortBy, setSortBy] = useState<'title' | 'created_at' | 'updated_at'>(
		'created_at',
	);
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set(),
	);
	const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>(
		{},
	);
	const [showSalesChannelPrompt, setShowSalesChannelPrompt] = useState(false);
	const [selectedSalesChannelId, setSelectedSalesChannelId] =
		useState<string>('');
	const [showProductEditor, setShowProductEditor] = useState(false);
	const [editingProduct, setEditingProduct] = useState<any>(null);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(50);

	// Fetch category tree
	const { data: categoryTreeData } = useQuery({
		queryKey: ['admin-category-tree'],
		queryFn: async () => {
			const res = await fetch('/admin/product-categories/tree', {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch category tree');
			const { categories } = await res.json();
			return categories as CategoryNode[];
		},
	});

	// Fetch collections
	const { data: collectionsData } = useQuery({
		queryKey: ['admin-collections'],
		queryFn: async () => {
			const res = await fetch('/admin/collections', {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch collections');
			const { product_collections } = await res.json();
			return product_collections as Collection[];
		},
	});

	// Fetch sales channels
	const { data: salesChannelsData } = useQuery({
		queryKey: ['admin-sales-channels'],
		queryFn: async () => {
			const res = await fetch('/admin/sales-channels', {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch sales channels');
			const { sales_channels } = await res.json();
			return sales_channels as SalesChannel[];
		},
	});

	// Fetch shipping profiles
	const { data: shippingProfilesData } = useQuery({
		queryKey: ['admin-shipping-profiles'],
		queryFn: async () => {
			const res = await fetch('/admin/shipping-profiles?limit=1000', {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch shipping profiles');
			const { shipping_profiles } = await res.json();
			return shipping_profiles as Array<{
				id: string;
				name: string;
				type: string;
			}>;
		},
	});

	// Build query params from filters
	const queryParams = useMemo(() => {
		const params = new URLSearchParams();
		// Set pagination
		const offset = (currentPage - 1) * pageSize;
		params.append('limit', pageSize.toString());
		params.append('offset', offset.toString());

		if (selectedCategories.size > 0) {
			Array.from(selectedCategories).forEach(id => {
				params.append('category_id', id);
			});
		}
		if (selectedCollections.size > 0) {
			Array.from(selectedCollections).forEach(id => {
				params.append('collection_id', id);
			});
		}
		if (selectedSalesChannels.size > 0) {
			Array.from(selectedSalesChannels).forEach(id => {
				params.append('sales_channel_id', id);
			});
		}
		if (selectedShippingProfiles.size > 0) {
			Array.from(selectedShippingProfiles).forEach(id => {
				params.append('shipping_profile_id', id);
			});
		}
		if (skuSearch.trim()) {
			params.append('sku', skuSearch.trim());
		}
		if (searchQuery.trim()) {
			params.append('q', searchQuery.trim());
		}
		const queryString = params.toString();
		console.log('[PRODUCTS-BY-CATEGORY] Query params:', queryString);
		return queryString;
	}, [
		selectedCategories,
		selectedCollections,
		selectedSalesChannels,
		selectedShippingProfiles,
		skuSearch,
		searchQuery,
		currentPage,
		pageSize,
	]);

	// Fetch products with filters - always enabled to show all products by default
	// Convert Sets to Arrays for proper serialization in query keys
	const selectedCategoriesArray = useMemo(
		() => Array.from(selectedCategories).sort(),
		[selectedCategories],
	);
	const selectedCollectionsArray = useMemo(
		() => Array.from(selectedCollections).sort(),
		[selectedCollections],
	);
	const selectedSalesChannelsArray = useMemo(
		() => Array.from(selectedSalesChannels).sort(),
		[selectedSalesChannels],
	);
	const selectedShippingProfilesArray = useMemo(
		() => Array.from(selectedShippingProfiles).sort(),
		[selectedShippingProfiles],
	);

	const {
		data: productsData,
		isLoading,
		error,
	} = useQuery({
		queryKey: [
			'admin-products-filtered',
			selectedCategoriesArray,
			selectedCollectionsArray,
			selectedSalesChannelsArray,
			selectedShippingProfilesArray,
			skuSearch,
			searchQuery,
			currentPage,
			pageSize,
		],
		queryFn: async () => {
			const url = `/admin/products/by-category${queryParams ? `?${queryParams}` : ''}`;
			console.log('[PRODUCTS-BY-CATEGORY] Fetching products from:', url);
			const res = await fetch(url, {
				credentials: 'include',
			});
			if (!res.ok) {
				const errorText = await res.text();
				console.error('[PRODUCTS-BY-CATEGORY] Error response:', errorText);
				throw new Error(`Failed to fetch products: ${res.status} ${errorText}`);
			}
			const data = await res.json();
			console.log('[PRODUCTS-BY-CATEGORY] Received products:', data);
			return data as {
				products: ProductListItem[];
				count: number;
				total: number;
			};
		},
		// Prevent excessive refetching
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
		staleTime: 30000, // Consider data fresh for 30 seconds
	});

	// Sort and filter products client-side
	const sortedAndFilteredProducts = useMemo(() => {
		let filtered = productsData?.products || [];

		// Apply sorting
		filtered = [...filtered].sort((a, b) => {
			let aValue: any;
			let bValue: any;

			switch (sortBy) {
				case 'title':
					aValue = a.title?.toLowerCase() || '';
					bValue = b.title?.toLowerCase() || '';
					break;
				case 'created_at':
					aValue = new Date(a.created_at || 0).getTime();
					bValue = new Date(b.created_at || 0).getTime();
					break;
				case 'updated_at':
					aValue = new Date(a.updated_at || 0).getTime();
					bValue = new Date(b.updated_at || 0).getTime();
					break;
				default:
					return 0;
			}

			if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
			return 0;
		});

		return filtered;
	}, [productsData?.products, sortBy, sortOrder]);

	// Bulk update mutation
	const bulkUpdateMutation = useMutation({
		mutationFn: async (data: {
			product_ids: string[];
			status?: 'published' | 'draft';
			sales_channel_id?: string;
			sales_channel_action?: 'add' | 'remove' | 'replace';
		}) => {
			const res = await fetch('/admin/products/bulk-update', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});
			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || 'Failed to update products');
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['admin-products-filtered'],
			});
			setRowSelection({});
			toast.success('Produkte erfolgreich aktualisiert');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Fehler beim Aktualisieren');
		},
	});

	const products = sortedAndFilteredProducts;
	const selectedCount = Object.keys(rowSelection).length;

	const handleSalesChannelUpdate = () => {
		if (!selectedSalesChannelId) {
			toast.error('Bitte wählen Sie einen Sales Channel aus');
			return;
		}
		const productIds = Object.keys(rowSelection);
		bulkUpdateMutation.mutate({
			product_ids: productIds,
			sales_channel_id: selectedSalesChannelId,
			sales_channel_action: 'replace',
		});
		setShowSalesChannelPrompt(false);
		setSelectedSalesChannelId('');
	};

	// Product save handler
	const handleProductSave = async (productData: any) => {
		try {
			if (editingProduct) {
				// Update existing product
				const res = await fetch(`/admin/products/${editingProduct.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(productData),
				});
				if (!res.ok) throw new Error('Failed to update product');
				toast.success('Produkt erfolgreich aktualisiert');
			} else {
				// Create new product
				const res = await fetch('/admin/products/create', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(productData),
				});
				if (!res.ok) throw new Error('Failed to create product');
				toast.success('Produkt erfolgreich erstellt');
			}
			queryClient.invalidateQueries({
				queryKey: ['admin-products-filtered'],
			});
			setShowProductEditor(false);
			setEditingProduct(null);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Fehler beim Speichern des Produkts',
			);
			throw error;
		}
	};

	const hasActiveFilters =
		selectedCategories.size > 0 ||
		selectedCollections.size > 0 ||
		selectedSalesChannels.size > 0 ||
		selectedShippingProfiles.size > 0 ||
		skuSearch.trim().length > 0 ||
		searchQuery.trim().length > 0;

	const clearAllFilters = () => {
		setSelectedCategories(new Set());
		setSelectedCollections(new Set());
		setSelectedSalesChannels(new Set());
		setSelectedShippingProfiles(new Set());
		setSkuSearch('');
		setSearchQuery('');
		setRowSelection({});
		setCurrentPage(1);
	};

	// Calculate pagination
	const totalPages = productsData?.total
		? Math.ceil(productsData.total / pageSize)
		: 0;
	const hasNextPage = currentPage < totalPages;
	const hasPrevPage = currentPage > 1;

	const handlePageChange = (newPage: number) => {
		if (newPage >= 1 && newPage <= totalPages) {
			setCurrentPage(newPage);
			setRowSelection({});
		}
	};

	return (
		<Container className="h-[calc(100vh-120px)] flex flex-col">
			<div className="flex gap-4 flex-1 min-h-0">
				{/* Filter Sidebar - Collapsible */}
				<div
					className={`${
						sidebarCollapsed ? 'w-0' : 'w-80'
					} flex-shrink-0 transition-all duration-300 overflow-hidden`}
				>
					<div className="space-y-6 h-full overflow-y-auto pr-2">
						<div>
							<Heading level="h2" className="text-lg font-semibold mb-4">
								Filter
							</Heading>

							{hasActiveFilters && (
								<Button
									variant="secondary"
									size="small"
									onClick={clearAllFilters}
									className="mb-4 w-full"
								>
									<X className="w-4 h-4 mr-2" />
									Alle Filter zurücksetzen
								</Button>
							)}

							{/* Category Tree */}
							<div className="mb-6">
								<Text size="small" className="font-semibold mb-2 block">
									Kategorien
								</Text>
								<div className="border border-ui-border-base rounded-lg p-3 max-h-[400px] overflow-y-auto">
									{categoryTreeData && categoryTreeData.length > 0 ? (
										<CategoryTree
											categories={categoryTreeData}
											selectedCategories={selectedCategories}
											onToggleCategory={id => {
												const newSet = new Set(selectedCategories);
												if (newSet.has(id)) {
													newSet.delete(id);
													console.log(
														'[PRODUCTS-BY-CATEGORY] Deselected category:',
														id,
													);
												} else {
													newSet.add(id);
													console.log(
														'[PRODUCTS-BY-CATEGORY] Selected category:',
														id,
													);
												}
												console.log(
													'[PRODUCTS-BY-CATEGORY] Selected categories:',
													Array.from(newSet),
												);
												setSelectedCategories(newSet);
												setRowSelection({});
											}}
											expandedCategories={expandedCategories}
											onToggleExpand={id => {
												const newSet = new Set(expandedCategories);
												if (newSet.has(id)) {
													newSet.delete(id);
												} else {
													newSet.add(id);
												}
												setExpandedCategories(newSet);
											}}
										/>
									) : (
										<Text size="small" className="text-ui-fg-subtle">
											Keine Kategorien gefunden
										</Text>
									)}
								</div>
							</div>

							{/* Collections Filter */}
							<div className="mb-6">
								<Text size="small" className="font-semibold mb-2 block">
									Sammlungen
								</Text>
								<div className="border border-ui-border-base rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
									{collectionsData && collectionsData.length > 0 ? (
										collectionsData.map(collection => (
											<div
												key={collection.id}
												className="flex items-center gap-2"
											>
												<Checkbox
													checked={selectedCollections.has(collection.id)}
													onCheckedChange={checked => {
														const newSet = new Set(selectedCollections);
														if (checked) {
															newSet.add(collection.id);
														} else {
															newSet.delete(collection.id);
														}
														setSelectedCollections(newSet);
														setRowSelection({});
													}}
												/>
												<Text size="small">{collection.title}</Text>
											</div>
										))
									) : (
										<Text size="small" className="text-ui-fg-subtle">
											Keine Sammlungen gefunden
										</Text>
									)}
								</div>
							</div>

							{/* Sales Channels Filter */}
							<div className="mb-6">
								<Text size="small" className="font-semibold mb-2 block">
									Vertriebskanäle
								</Text>
								<div className="border border-ui-border-base rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
									{salesChannelsData && salesChannelsData.length > 0 ? (
										salesChannelsData.map(channel => (
											<div key={channel.id} className="flex items-center gap-2">
												<Checkbox
													checked={selectedSalesChannels.has(channel.id)}
													onCheckedChange={checked => {
														const newSet = new Set(selectedSalesChannels);
														if (checked) {
															newSet.add(channel.id);
														} else {
															newSet.delete(channel.id);
														}
														setSelectedSalesChannels(newSet);
														setRowSelection({});
													}}
												/>
												<Text size="small">{channel.name}</Text>
											</div>
										))
									) : (
										<Text size="small" className="text-ui-fg-subtle">
											Keine Vertriebskanäle gefunden
										</Text>
									)}
								</div>
							</div>

							{/* Shipping Profiles Filter */}
							<div className="mb-6">
								<Text size="small" className="font-semibold mb-2 block">
									Versandprofile
								</Text>
								<div className="border border-ui-border-base rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
									{shippingProfilesData && shippingProfilesData.length > 0 ? (
										shippingProfilesData.map(profile => (
											<div key={profile.id} className="flex items-center gap-2">
												<Checkbox
													checked={selectedShippingProfiles.has(profile.id)}
													onCheckedChange={checked => {
														const newSet = new Set(selectedShippingProfiles);
														if (checked) {
															newSet.add(profile.id);
														} else {
															newSet.delete(profile.id);
														}
														setSelectedShippingProfiles(newSet);
														setRowSelection({});
													}}
												/>
												<Text size="small">{profile.name}</Text>
											</div>
										))
									) : (
										<Text size="small" className="text-ui-fg-subtle">
											Keine Versandprofile gefunden
										</Text>
									)}
								</div>
							</div>

							{/* SKU Search */}
							<div>
								<Text size="small" className="font-semibold mb-2 block">
									Artikelnummer (SKU)
								</Text>
								<Input
									value={skuSearch}
									onChange={e => {
										setSkuSearch(e.target.value);
										setRowSelection({});
									}}
									placeholder="SKU suchen..."
									className="w-full"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Sidebar Toggle Button */}
				<button
					onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
					className="flex-shrink-0 w-6 h-12 self-center rounded-md border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle transition-colors flex items-center justify-center"
					aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
				>
					{sidebarCollapsed ? (
						<ChevronRight className="w-4 h-4" />
					) : (
						<ChevronLeft className="w-4 h-4" />
					)}
				</button>

				{/* Main Content */}
				<div className="flex-1 flex flex-col gap-3 min-w-0 h-full">
					{/* Header */}
					<div className="flex-shrink-0">
						<Heading level="h1" className="text-2xl font-bold">
							Produkte filtern
						</Heading>
						<Text size="small" className="text-ui-fg-subtle mt-1">
							Verwalten Sie Produkte mit erweiterten Filtern und Bulk-Actions
						</Text>
					</div>

					{/* Products Table - Always show, filtered by selected categories */}
					<div className="flex-1 flex flex-col gap-2 min-h-0">
						{error && (
							<div className="p-2 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
								<Text size="small" className="text-red-600">
									Fehler beim Laden der Produkte:{' '}
									{error instanceof Error
										? error.message
										: 'Unbekannter Fehler'}
								</Text>
							</div>
						)}
						<div className="flex justify-between items-center flex-shrink-0 py-1">
							<Heading level="h2" className="text-lg">
								Produkte
								{productsData?.total !== undefined && (
									<Text size="small" className="text-ui-fg-subtle ml-2">
										({products.length} von {productsData.total} angezeigt
										{hasActiveFilters && ' gefiltert'})
									</Text>
								)}
							</Heading>
							<Button
								variant="secondary"
								size="small"
								onClick={() => {
									setEditingProduct(null);
									setShowProductEditor(true);
								}}
							>
								<Plus className="w-4 h-4 mr-2" />
								Produkt erstellen
							</Button>
						</div>

						{/* Search and Sort Toolbar */}
						<div className="flex gap-3 items-center p-2 bg-ui-bg-subtle rounded-lg border border-ui-border-base flex-shrink-0">
							<div className="flex-1">
								<Input
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									placeholder="Nach Titel oder Handle suchen..."
									className="w-full"
								/>
							</div>
							<div className="flex gap-2 items-center">
								{selectedCount > 0 && (
									<Text
										size="small"
										className="font-medium text-ui-fg-base whitespace-nowrap"
									>
										{selectedCount} ausgewählt
									</Text>
								)}
								<Text size="small" className="whitespace-nowrap">
									Sortieren nach:
								</Text>
								<Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
									<Select.Trigger className="w-[180px]">
										<Select.Value />
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="title">Titel</Select.Item>
										<Select.Item value="created_at">Erstellt am</Select.Item>
										<Select.Item value="updated_at">
											Aktualisiert am
										</Select.Item>
									</Select.Content>
								</Select>
								<Select
									value={sortOrder}
									onValueChange={v => setSortOrder(v as any)}
								>
									<Select.Trigger className="w-[120px]">
										<Select.Value />
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="asc">Aufsteigend</Select.Item>
										<Select.Item value="desc">Absteigend</Select.Item>
									</Select.Content>
								</Select>
								<Text size="small" className="whitespace-nowrap">
									Pro Seite:
								</Text>
								<Select
									value={pageSize.toString()}
									onValueChange={v => {
										setPageSize(parseInt(v));
										setCurrentPage(1); // Reset to first page when changing page size
										setRowSelection({}); // Clear selection when changing page size
									}}
								>
									<Select.Trigger className="w-[100px]">
										<Select.Value />
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="25">25</Select.Item>
										<Select.Item value="50">50</Select.Item>
										<Select.Item value="100">100</Select.Item>
										<Select.Item value="200">200</Select.Item>
									</Select.Content>
								</Select>
							</div>
						</div>

						{/* Bulk Actions Toolbar */}
						{selectedCount > 0 && (
							<div className="flex items-center justify-between p-3 bg-ui-bg-subtle border-b border-ui-border-base flex-shrink-0">
								<Text size="small" className="font-medium">
									{selectedCount} Produkt{selectedCount !== 1 ? 'e' : ''}{' '}
									ausgewählt
								</Text>
								<div className="flex items-center gap-2">
									<Button
										variant="secondary"
										size="small"
										onClick={() => {
											const productIds = Object.keys(rowSelection);
											bulkUpdateMutation.mutate({
												product_ids: productIds,
												status: 'published',
											});
										}}
										disabled={bulkUpdateMutation.isPending}
									>
										Veröffentlichen
									</Button>
									<Button
										variant="secondary"
										size="small"
										onClick={() => {
											const productIds = Object.keys(rowSelection);
											bulkUpdateMutation.mutate({
												product_ids: productIds,
												status: 'draft',
											});
										}}
										disabled={bulkUpdateMutation.isPending}
									>
										Als Entwurf speichern
									</Button>
									<Button
										variant="secondary"
										size="small"
										onClick={() => setShowSalesChannelPrompt(true)}
										disabled={bulkUpdateMutation.isPending}
									>
										Vertriebskanal ändern
									</Button>
									<Button
										variant="transparent"
										size="small"
										onClick={() => setRowSelection({})}
									>
										Auswahl aufheben
									</Button>
								</div>
							</div>
						)}

						{/* Scrollable Table Container with Gray Background */}
						<div className="flex-1 bg-ui-bg-subtle rounded-lg border border-ui-border-base p-2 overflow-auto min-h-0">
							<ProductTable
								products={products}
								rowSelection={rowSelection}
								onRowSelectionChange={setRowSelection}
								onEdit={async product => {
									// Fetch full product details before opening modal
									try {
										const res = await fetch(`/admin/products/${product.id}?fields=*,tags.*,categories.*,sales_channels.*,type.*,shipping_profile.*,collection.*`, {
											credentials: 'include',
										});
										if (res.ok) {
											const data = await res.json();
											console.log('[ProductEdit] Fetched product with tags:', data.product);
											setEditingProduct(data.product);
											setShowProductEditor(true);
										} else {
											toast.error('Fehler beim Laden der Produktdetails');
										}
									} catch (error) {
										console.error('[ProductEdit] Error fetching product:', error);
										toast.error('Fehler beim Laden der Produktdetails');
									}
								}}
								onUpdate={async (productId, updates) => {
									const res = await fetch(`/admin/products/${productId}`, {
										method: 'PUT',
										headers: { 'Content-Type': 'application/json' },
										credentials: 'include',
										body: JSON.stringify(updates),
									});
									if (!res.ok) throw new Error('Failed to update product');
									queryClient.invalidateQueries({
										queryKey: ['admin-products-filtered'],
									});
									return res.json();
								}}
								isLoading={isLoading}
							/>
						</div>

						{/* Pagination Controls */}
						{totalPages > 1 && (
							<div className="flex justify-center items-center gap-2 flex-shrink-0 pt-2">
								<Button
									variant="secondary"
									size="small"
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={!hasPrevPage}
								>
									<ChevronLeft className="w-4 h-4 mr-1" />
									Vorherige
								</Button>
								<div className="flex items-center gap-1">
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										let pageNum: number;
										if (totalPages <= 5) {
											pageNum = i + 1;
										} else if (currentPage <= 3) {
											pageNum = i + 1;
										} else if (currentPage >= totalPages - 2) {
											pageNum = totalPages - 4 + i;
										} else {
											pageNum = currentPage - 2 + i;
										}
										return (
											<Button
												key={pageNum}
												variant={
													currentPage === pageNum ? 'primary' : 'secondary'
												}
												size="small"
												onClick={() => handlePageChange(pageNum)}
												className="min-w-[40px]"
											>
												{pageNum}
											</Button>
										);
									})}
								</div>
								<Text size="small" className="text-ui-fg-subtle">
									Seite {currentPage} von {totalPages}
								</Text>
								<Button
									variant="secondary"
									size="small"
									onClick={() => handlePageChange(currentPage + 1)}
									disabled={!hasNextPage}
								>
									Nächste
									<ChevronRight className="w-4 h-4 ml-1" />
								</Button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Product Editor Modal */}
			<ProductEditorModal
				open={showProductEditor}
				onOpenChange={open => {
					setShowProductEditor(open);
					if (!open) {
						setEditingProduct(null);
					}
				}}
				product={editingProduct}
				onSave={handleProductSave}
			/>

			{/* Sales Channel Prompt */}
			<Prompt
				open={showSalesChannelPrompt}
				onOpenChange={setShowSalesChannelPrompt}
			>
				<Prompt.Content>
					<Prompt.Header>
						<Prompt.Title>Sales Channel ändern</Prompt.Title>
						<Prompt.Description>
							Wählen Sie den Sales Channel für {selectedCount} ausgewählte
							Produkt(e)
						</Prompt.Description>
					</Prompt.Header>
					<div className="space-y-4 py-4">
						<Select
							value={selectedSalesChannelId}
							onValueChange={setSelectedSalesChannelId}
						>
							<Select.Trigger>
								<Select.Value placeholder="Sales Channel auswählen" />
							</Select.Trigger>
							<Select.Content>
								{(salesChannelsData || []).map(channel => (
									<Select.Item key={channel.id} value={channel.id}>
										{channel.name}
									</Select.Item>
								))}
							</Select.Content>
						</Select>
					</div>
					<Prompt.Footer>
						<Prompt.Cancel>Abbrechen</Prompt.Cancel>
						<Prompt.Action onClick={handleSalesChannelUpdate}>
							Ändern
						</Prompt.Action>
					</Prompt.Footer>
				</Prompt.Content>
			</Prompt>
		</Container>
	);
}

// Route configuration
export const config = defineRouteConfig({
	label: 'Produkte nach Kategorie',
	icon: FolderTree,
});
