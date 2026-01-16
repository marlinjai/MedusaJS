// busbasisberlin/src/admin/routes/products/by-category/components/ProductOrganizeTab.tsx
// Product organize tab matching core Medusa UI

import { Button, Checkbox, Input, Label, Select, Text } from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import CategoryTree, { type CategoryNode } from './CategoryTree';

type Variant = {
	id?: string;
	title?: string;
	sku?: string;
	manage_inventory?: boolean;
	allow_backorder?: boolean;
	prices?: Array<{ amount: number; currency_code: string }>;
	price_eur?: number;
};

type ProductFormData = {
	id?: string;
	discountable?: boolean;
	type_id?: string;
	collection_id?: string;
	category_ids?: string[];
	tags?: string[];
	shipping_profile_id?: string;
	sales_channel_ids?: string[];
	variants?: Variant[];
};

interface ProductOrganizeTabProps {
	formData: Partial<ProductFormData>;
	onChange: (data: Partial<ProductFormData>) => void;
}

const ProductOrganizeTab = ({
	formData,
	onChange,
}: ProductOrganizeTabProps) => {
	const [tagInput, setTagInput] = useState('');
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set(),
	);

	// Fetch collections
	const { data: collectionsData = [] } = useQuery({
		queryKey: ['admin-collections'],
		queryFn: async () => {
			try {
				const res = await fetch('/admin/collections?limit=1000', {
					credentials: 'include',
				});
				if (!res.ok) {
					console.error(
						'[ProductOrganizeTab] Collections fetch failed:',
						res.status,
						res.statusText,
					);
					return [];
				}
				const data = await res.json();
				console.log('[ProductOrganizeTab] Collections API response:', data);
				// API returns { collections: [...] }
				const collections =
					data?.collections ||
					data?.product_collections ||
					data?.data ||
					(Array.isArray(data) ? data : []);
				const result = Array.isArray(collections) ? collections : [];
				console.log('[ProductOrganizeTab] Parsed collections:', result);
				return result;
			} catch (error) {
				console.error(
					'[ProductOrganizeTab] Error fetching collections:',
					error,
				);
				return [];
			}
		},
		initialData: [],
		placeholderData: [],
		retry: 2,
		retryDelay: 1000,
	});

	// Fetch product types
	const { data: productTypesData = [] } = useQuery({
		queryKey: ['admin-product-types'],
		queryFn: async () => {
			try {
				const res = await fetch('/admin/product-types?limit=1000', {
					credentials: 'include',
				});
				if (!res.ok) {
					console.error(
						'[ProductOrganizeTab] Product types fetch failed:',
						res.status,
						res.statusText,
					);
					return [];
				}
				const data = await res.json();
				console.log('[ProductOrganizeTab] Product types API response:', data);
				// API returns { product_types: [...] }
				const types =
					data?.product_types ||
					data?.data ||
					(Array.isArray(data) ? data : []);
				const result = Array.isArray(types) ? types : [];
				console.log('[ProductOrganizeTab] Parsed product types:', result);
				return result;
			} catch (error) {
				console.error(
					'[ProductOrganizeTab] Error fetching product types:',
					error,
				);
				return [];
			}
		},
		initialData: [],
		placeholderData: [],
		retry: 2,
		retryDelay: 1000,
	});

	// Fetch shipping profiles
	const { data: shippingProfilesData = [] } = useQuery({
		queryKey: ['admin-shipping-profiles'],
		queryFn: async () => {
			try {
				const res = await fetch('/admin/shipping-profiles?limit=1000', {
					credentials: 'include',
				});
				if (!res.ok) {
					return [];
				}
				const data = await res.json();
				// API returns { shipping_profiles: [...] }
				const profiles =
					data?.shipping_profiles ||
					data?.data ||
					(Array.isArray(data) ? data : []);
				return Array.isArray(profiles) ? profiles : [];
			} catch (error) {
				return [];
			}
		},
		initialData: [],
		placeholderData: [],
		retry: 2,
		retryDelay: 1000,
	});

	// Fetch product tags using multiple fallback strategies
	const {
		data: productTagsData = [],
		isLoading: isLoadingTags,
		error: tagsError,
	} = useQuery({
		queryKey: ['admin-product-tags'],
		queryFn: async () => {
			try {
				console.log('[ProductOrganizeTab] Fetching product tags...');

				// Try the admin API first
				let res = await fetch('/admin/product-tags?limit=1000', {
					credentials: 'include',
				});
				console.log(
					'[ProductOrganizeTab] Product tags fetch response:',
					res.status,
					res.statusText,
				);

				// If 503 or other server error, try alternative approaches
				if (!res.ok) {
					console.warn(
						'[ProductOrganizeTab] Primary fetch failed, trying alternatives:',
						res.status,
						res.statusText,
					);

					// Try without limit parameter
					res = await fetch('/admin/product-tags', {
						credentials: 'include',
					});

					if (!res.ok) {
						console.error(
							'[ProductOrganizeTab] All fetch attempts failed:',
							res.status,
							res.statusText,
						);
						// Only return fallback tags on actual API errors, not empty results
						throw new Error(`API failed with status ${res.status}`);
					}
				}

				const data = await res.json();
				console.log('[ProductOrganizeTab] Product tags API response:', data);

				// Handle different response formats
				const tags =
					data?.product_tags ||
					data?.data ||
					data?.tags ||
					(Array.isArray(data) ? data : []);
				const result = Array.isArray(tags) ? tags : [];
				console.log('[ProductOrganizeTab] Parsed product tags:', result);
				console.log('[ProductOrganizeTab] Sample tag structure:', result[0]);

				// Return actual result - empty array is valid if no tags exist in system
				return result;
			} catch (error) {
				console.error(
					'[ProductOrganizeTab] Error fetching product tags:',
					error,
				);
				// Return fallback tags
				return [
					{ id: 'featured', value: 'featured' },
					{ id: 'new', value: 'new' },
					{ id: 'bestseller', value: 'bestseller' },
					{ id: 'sale', value: 'sale' },
				];
			}
		},
		initialData: [],
		placeholderData: [],
		retry: 2,
		retryDelay: 2000,
		// Keep data fresh but don't refetch too aggressively
		staleTime: 300000, // 5 minutes
		gcTime: 600000, // 10 minutes
	});

	// Fetch categories tree with hierarchical structure
	const { data: categoryTreeData } = useQuery({
		queryKey: ['admin-category-tree'],
		queryFn: async () => {
			const res = await fetch('/admin/product-categories/tree', {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch category tree');
			const { categories } = await res.json();
			return (categories || []) as CategoryNode[];
		},
	});

	// Fetch sales channels
	const { data: salesChannelsData = [] } = useQuery({
		queryKey: ['admin-sales-channels'],
		queryFn: async () => {
			try {
				const res = await fetch('/admin/sales-channels', {
					credentials: 'include',
				});
				if (!res.ok) {
					console.error(
						'[ProductOrganizeTab] Sales channels fetch failed:',
						res.status,
						res.statusText,
					);
					return [];
				}
				const data = await res.json();
				console.log('[ProductOrganizeTab] Sales channels API response:', data);
				// API returns { sales_channels: [...] }
				return data?.sales_channels || data?.channels || [];
			} catch (error) {
				console.error(
					'[ProductOrganizeTab] Error fetching sales channels:',
					error,
				);
				return [];
			}
		},
		initialData: [],
		placeholderData: [],
		retry: 2,
		retryDelay: 1000,
	});

	// Debug: Log formData state for inventory check
	console.log('[ProductOrganizeTab] INVENTORY CHECK - formData state:', {
		hasId: !!formData.id,
		id: formData.id,
		hasVariants: !!formData.variants,
		variantsLength: formData.variants?.length,
		variantIds: formData.variants?.map(v => v.id),
		queryEnabled: !!formData.id && !!formData.variants && (formData.variants?.length || 0) > 0,
	});

	// Fetch inventory data for variants if product ID exists
	// Note: Medusa v2 requires separate API calls to get location_levels
	const { data: inventoryData } = useQuery({
		queryKey: ['product-variant-inventory', formData.id],
		queryFn: async () => {
			console.log('[ProductOrganizeTab] INVENTORY FETCH START', {
				productId: formData.id,
				variantsCount: formData.variants?.length,
				variants: formData.variants?.map(v => ({ id: v.id, sku: v.sku })),
			});

			if (
				!formData.id ||
				!formData.variants ||
				formData.variants.length === 0
			) {
				console.log('[ProductOrganizeTab] INVENTORY FETCH SKIPPED - no product or variants');
				return {};
			}

			try {
				// Fetch inventory for each variant
				// In Medusa v2, inventory items are linked to variants by SKU
				const inventoryPromises = formData.variants.map(async variant => {
					if (!variant.id) {
						console.log('[ProductOrganizeTab] Variant has no ID:', variant);
						return { variantId: variant.id, quantity: 0 };
					}

					// In Medusa v2, inventory items are linked by SKU, not variant_id
					// If no SKU, we can't fetch inventory
					if (!variant.sku) {
						console.log('[ProductOrganizeTab] Variant has no SKU, cannot fetch inventory:', variant.id);
						return { variantId: variant.id, quantity: 0 };
					}

					// Step 1: Fetch inventory items by SKU (Medusa v2 approach)
					const inventoryUrl = `/admin/inventory-items?sku=${encodeURIComponent(variant.sku)}`;
					console.log('[ProductOrganizeTab] Fetching inventory items by SKU:', inventoryUrl);

					const res = await fetch(inventoryUrl, {
						credentials: 'include',
					});

					console.log('[ProductOrganizeTab] Inventory items response status:', res.status);

					if (!res.ok) {
						const errorText = await res.text();
						console.error('[ProductOrganizeTab] Inventory items fetch FAILED:', {
							variantId: variant.id,
							sku: variant.sku,
							status: res.status,
							error: errorText,
						});
						return { variantId: variant.id, quantity: 0 };
					}

					const data = await res.json();
					console.log('[ProductOrganizeTab] Inventory items response:', {
						variantId: variant.id,
						sku: variant.sku,
						fullResponse: data,
						inventoryItemsCount: data?.inventory_items?.length,
					});

					const inventoryItems = data?.inventory_items || [];

					// Medusa v2 includes location_levels directly in the inventory-items response
					// Sum up quantities from all inventory items (usually just one per variant)
					let totalStocked = 0;
					let totalReserved = 0;
					let totalAvailable = 0;

					for (const item of inventoryItems) {
						// Use stocked_quantity from item directly, or sum from location_levels
						if (item.stocked_quantity !== undefined) {
							totalStocked += item.stocked_quantity || 0;
							totalReserved += item.reserved_quantity || 0;
						}

						// Also check location_levels if present (more detailed breakdown)
						if (item.location_levels && Array.isArray(item.location_levels)) {
							for (const level of item.location_levels) {
								totalAvailable += level.available_quantity || 0;
							}
						} else {
							// Fallback: available = stocked - reserved
							totalAvailable = totalStocked - totalReserved;
						}
					}

					console.log('[ProductOrganizeTab] Inventory totals for variant:', {
						variantId: variant.id,
						sku: variant.sku,
						stocked: totalStocked,
						reserved: totalReserved,
						available: totalAvailable,
					});

					return {
						variantId: variant.id,
						stocked: totalStocked,
						reserved: totalReserved,
						available: totalAvailable,
					};
				});

				const results = await Promise.all(inventoryPromises);
				const inventoryMap: Record<string, { stocked: number; reserved: number; available: number }> = {};

				results.forEach(result => {
					if (result.variantId) {
						inventoryMap[result.variantId] = {
							stocked: result.stocked,
							reserved: result.reserved,
							available: result.available,
						};
					}
				});

				console.log('[ProductOrganizeTab] INVENTORY FETCH COMPLETE:', inventoryMap);

				return inventoryMap;
			} catch (error) {
				console.error('[ProductOrganizeTab] INVENTORY FETCH ERROR:', error);
				return {};
			}
		},
		enabled:
			!!formData.id && !!formData.variants && formData.variants.length > 0,
		staleTime: 0, // Always fetch fresh inventory data
		refetchOnMount: 'always', // Refetch when component mounts
	});

	const handleAddTag = (tagValue?: string) => {
		const tagToAdd = tagValue || tagInput.trim();
		if (tagToAdd) {
			const currentTags = formData.tags || [];
			// Avoid duplicates
			if (!currentTags.includes(tagToAdd)) {
				const newTags = [...currentTags, tagToAdd];
				onChange({ ...formData, tags: newTags });
				setTagInput('');
			}
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		const newTags = (formData.tags || []).filter(tag => tag !== tagToRemove);
		onChange({ ...formData, tags: newTags });
	};

	// Show ALL available tags (including already selected ones for better UX)
	const availableTags = Array.isArray(productTagsData) ? productTagsData : [];

	// Debug: Log current form tags to help troubleshoot
	console.log('[ProductOrganizeTab] Current formData.tags:', formData.tags);
	console.log(
		'[ProductOrganizeTab] Available tags count:',
		availableTags.length,
	);

	const handleAddSalesChannel = (channelId: string) => {
		const newChannels = [...(formData.sales_channel_ids || []), channelId];
		onChange({ ...formData, sales_channel_ids: newChannels });
	};

	const handleRemoveSalesChannel = (channelId: string) => {
		const newChannels = (formData.sales_channel_ids || []).filter(
			id => id !== channelId,
		);
		onChange({ ...formData, sales_channel_ids: newChannels });
	};

	const selectedSalesChannels = Array.isArray(salesChannelsData)
		? salesChannelsData.filter((sc: any) =>
				(formData.sales_channel_ids || []).includes(sc.id),
			)
		: [];

	const availableSalesChannels = Array.isArray(salesChannelsData)
		? salesChannelsData.filter(
				(sc: any) => !(formData.sales_channel_ids || []).includes(sc.id),
			)
		: [];

	return (
		<div className="space-y-6">
			{/* Discountable Toggle */}
			<div className="flex items-center gap-3">
				<Checkbox
					checked={formData.discountable ?? true}
					onCheckedChange={checked =>
						onChange({ ...formData, discountable: checked as boolean })
					}
				/>
				<div>
					<Label>Rabattierbar (Optional)</Label>
					<Text size="small" className="text-ui-fg-subtle block mt-1">
						Wenn diese Option deaktiviert ist, werden auf dieses Produkt keine
						Rabatte gewährt
					</Text>
				</div>
			</div>

			{/* Type */}
			<div>
				<Label htmlFor="type" className="mb-2">
					Typ (Optional){' '}
					{productTypesData?.length > 0 && `(${productTypesData.length})`}
				</Label>
				<Select
					value={formData.type_id || undefined}
					onValueChange={value => {
						console.log('[ProductOrganizeTab] Type selected:', value);
						onChange({ ...formData, type_id: value || undefined });
					}}
				>
					<Select.Trigger id="type">
						<Select.Value placeholder="Typ auswählen" />
					</Select.Trigger>
					<Select.Content>
						{Array.isArray(productTypesData) && productTypesData.length > 0 ? (
							productTypesData.map((type: any) => {
								console.log('[ProductOrganizeTab] Rendering type:', type);
								return (
									<Select.Item key={type.id} value={type.id}>
										{type.value || type.name || type.id}
									</Select.Item>
								);
							})
						) : (
							<div className="px-2 py-1.5 text-sm text-ui-fg-subtle">
								{productTypesData === undefined
									? 'Lade Typen...'
									: 'Keine Typen verfügbar'}
							</div>
						)}
					</Select.Content>
				</Select>
			</div>

			{/* Collection */}
			<div>
				<Label htmlFor="collection" className="mb-2">
					Sammlung (Optional){' '}
					{collectionsData?.length > 0 && `(${collectionsData.length})`}
				</Label>
				<Select
					value={formData.collection_id || undefined}
					onValueChange={value => {
						console.log('[ProductOrganizeTab] Collection selected:', value);
						onChange({ ...formData, collection_id: value || undefined });
					}}
				>
					<Select.Trigger id="collection">
						<Select.Value placeholder="Sammlung auswählen" />
					</Select.Trigger>
					<Select.Content>
						{Array.isArray(collectionsData) && collectionsData.length > 0 ? (
							collectionsData.map((collection: any) => {
								console.log(
									'[ProductOrganizeTab] Rendering collection:',
									collection,
								);
								return (
									<Select.Item key={collection.id} value={collection.id}>
										{collection.title || collection.name || collection.id}
									</Select.Item>
								);
							})
						) : (
							<div className="px-2 py-1.5 text-sm text-ui-fg-subtle">
								{collectionsData === undefined
									? 'Lade Sammlungen...'
									: 'Keine Sammlungen verfügbar'}
							</div>
						)}
					</Select.Content>
				</Select>
			</div>

			{/* Categories */}
			<div>
				<Label className="mb-2">Kategorien (Optional)</Label>
				<div className="border border-ui-border-base rounded-lg p-3 max-h-[400px] overflow-y-auto">
					{categoryTreeData && categoryTreeData.length > 0 ? (
						<CategoryTree
							categories={categoryTreeData}
							selectedCategories={new Set(formData.category_ids || [])}
							onToggleCategory={id => {
											const currentIds = formData.category_ids || [];
								if (currentIds.includes(id)) {
												onChange({
													...formData,
										category_ids: currentIds.filter(cid => cid !== id),
												});
											} else {
												onChange({
													...formData,
										category_ids: [...currentIds, id],
												});
											}
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
							Keine Kategorien verfügbar
						</Text>
					)}
				</div>
			</div>

			{/* Tags/Keywords */}
			<div>
				<Label className="mb-2">Schlagworte (Optional)</Label>
				{/* Debug info for troubleshooting */}
				{isLoadingTags && (
					<Text size="small" className="text-ui-fg-subtle mb-2">
						Lade Tags...
					</Text>
				)}
				{tagsError && (
					<Text size="small" className="text-red-500 mb-2">
						Fehler beim Laden der Tags: {tagsError.message}
					</Text>
				)}
				{!isLoadingTags && availableTags.length === 0 && (
					<Text size="small" className="text-ui-fg-subtle mb-2">
						Keine Tags verfügbar
					</Text>
				)}
				<div className="space-y-2">
					{/* Select existing tags */}
					{availableTags.length > 0 && (
						<Select
							value={undefined}
							onValueChange={value => {
								if (value) {
									const selectedTag = productTagsData?.find(
										(tag: any) => tag.id === value,
									);
									if (
										selectedTag &&
										!(formData.tags || []).includes(selectedTag.value)
									) {
										handleAddTag(selectedTag.value);
									}
								}
							}}
						>
							<Select.Trigger>
								<Select.Value placeholder="Existierendes Tag auswählen" />
							</Select.Trigger>
							<Select.Content>
								{availableTags.map((tag: any) => {
									const isSelected = (formData.tags || []).includes(tag.value);
									return (
										<Select.Item
											key={tag.id}
											value={tag.id}
											className={
												isSelected ? 'bg-ui-bg-subtle text-ui-fg-subtle' : ''
											}
										>
											{tag.value} {isSelected && '(bereits ausgewählt)'}
										</Select.Item>
									);
								})}
							</Select.Content>
						</Select>
					)}
					{/* Add new tag manually */}
					<div className="flex gap-2">
						<Input
							value={tagInput}
							onChange={e => setTagInput(e.target.value)}
							onKeyDown={e => {
								if (e.key === 'Enter') {
									e.preventDefault();
									handleAddTag();
								}
							}}
							placeholder="Neues Tag hinzufügen"
						/>
						<Button onClick={() => handleAddTag()} size="small">
							<Plus className="w-4 h-4" />
						</Button>
					</div>
				</div>
				{formData.tags && formData.tags.length > 0 && (
					<div className="flex flex-wrap gap-2 mt-2">
						{formData.tags.map(tag => (
							<div
								key={tag}
								className="flex items-center gap-1 px-2 py-1 bg-ui-bg-subtle rounded text-sm"
							>
								<Text size="small">{tag}</Text>
								<Button
									variant="transparent"
									size="small"
									onClick={() => handleRemoveTag(tag)}
									className="h-4 w-4 p-0"
								>
									<X className="w-3 h-3" />
								</Button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Shipping Profile */}
			<div>
				<Label htmlFor="shipping_profile" className="mb-2">
					Shipping profile (Optional){' '}
					{shippingProfilesData?.length > 0 &&
						`(${shippingProfilesData.length})`}
				</Label>
				<Text size="small" className="text-ui-fg-subtle block mb-2">
					Connect the product to a shipping profile
				</Text>
				<Select
					value={formData.shipping_profile_id || undefined}
					onValueChange={value => {
						onChange({
							...formData,
							shipping_profile_id: value || undefined,
						});
					}}
				>
					<Select.Trigger id="shipping_profile">
						<Select.Value placeholder="Shipping profile auswählen" />
					</Select.Trigger>
					<Select.Content>
						{Array.isArray(shippingProfilesData) &&
						shippingProfilesData.length > 0 ? (
							shippingProfilesData.map((profile: any) => (
								<Select.Item key={profile.id} value={profile.id}>
									{profile.name || profile.title || profile.id}
								</Select.Item>
							))
						) : (
							<div className="px-2 py-1.5 text-sm text-ui-fg-subtle">
								{shippingProfilesData === undefined
									? 'Lade Shipping Profiles...'
									: 'Keine Shipping Profiles verfügbar'}
							</div>
						)}
					</Select.Content>
				</Select>
			</div>

			{/* Sales Channels */}
			<div>
				<Label className="mb-2">Vertriebskanäle (Optional)</Label>
				<Text size="small" className="text-ui-fg-subtle block mb-3">
					Dieses Produkt ist nur dann im Standard-Vertriebskanal verfügbar, wenn
					es unberührt bleibt.
				</Text>
				{selectedSalesChannels.length > 0 && (
					<div className="flex flex-wrap gap-2 mb-3">
						{selectedSalesChannels.map((channel: any) => (
							<div
								key={channel.id}
								className="flex items-center gap-1 px-2 py-1 bg-ui-bg-subtle rounded text-sm"
							>
								<Text size="small">{channel.name}</Text>
								<Button
									variant="transparent"
									size="small"
									onClick={() => handleRemoveSalesChannel(channel.id)}
									className="h-4 w-4 p-0"
								>
									<X className="w-3 h-3" />
								</Button>
							</div>
						))}
						{selectedSalesChannels.length > 1 && (
							<Button
								variant="transparent"
								size="small"
								onClick={() => onChange({ ...formData, sales_channel_ids: [] })}
								className="text-ui-fg-muted"
							>
								Alles löschen
							</Button>
						)}
					</div>
				)}
				{availableSalesChannels.length > 0 && (
					<Select
						value={undefined}
						onValueChange={value => {
							if (value) {
								handleAddSalesChannel(value);
							}
						}}
					>
						<Select.Trigger>
							<Select.Value placeholder="Vertriebskanal hinzufügen" />
						</Select.Trigger>
						<Select.Content>
							{availableSalesChannels.map((channel: any) => (
								<Select.Item key={channel.id} value={channel.id}>
									{channel.name}
								</Select.Item>
							))}
						</Select.Content>
					</Select>
				)}
			</div>

			{/* Variant Information Display (Read-only) */}
			{formData.variants && formData.variants.length > 0 && (
				<div>
					<Label className="mb-2">Varianten-Übersicht</Label>
					<Text size="small" className="text-ui-fg-subtle block mb-3">
						Anzeige der Variantenpreise und Bestandsinformationen (Bearbeitung
						im Varianten-Tab)
					</Text>
					<div className="border border-ui-border-base rounded-lg overflow-hidden">
						<table className="w-full">
							<thead className="bg-ui-bg-subtle border-b border-ui-border-base">
								<tr>
									<th className="text-left px-3 py-2 text-sm font-medium text-ui-fg-base">
										Variante
									</th>
									<th className="text-left px-3 py-2 text-sm font-medium text-ui-fg-base">
										SKU
									</th>
									<th className="text-right px-3 py-2 text-sm font-medium text-ui-fg-base">
										Preis EUR
									</th>
									<th className="text-center px-3 py-2 text-sm font-medium text-ui-fg-base">
										Bestandsverwaltung
									</th>
									<th className="text-right px-3 py-2 text-sm font-medium text-ui-fg-base">
										Bestand
									</th>
									<th className="text-right px-3 py-2 text-sm font-medium text-ui-fg-base">
										Reserviert
									</th>
									<th className="text-center px-3 py-2 text-sm font-medium text-ui-fg-base">
										Rückstand zulassen
									</th>
								</tr>
							</thead>
							<tbody>
								{formData.variants.map((variant, index) => {
									// Use flat price fields (already transformed from Medusa format in ProductEditorModal)
									// price_eur is in euros (not cents)
									const eurPrice = variant.price_eur ?? 0;

									// Get inventory data (new structure with stocked, reserved, available)
									const inventoryInfo = variant.id
										? inventoryData?.[variant.id]
										: null;
									const stocked = inventoryInfo?.stocked ?? 0;
									const reserved = inventoryInfo?.reserved ?? 0;

									return (
										<tr
											key={variant.id || index}
											className="border-b border-ui-border-base last:border-b-0 hover:bg-ui-bg-subtle-hover"
										>
											<td className="px-3 py-2">
												{variant.id && formData.id ? (
													<a
														href={`/app/products/${formData.id}/variants/${variant.id}`}
														target="_blank"
														rel="noopener noreferrer"
														className="text-sm text-ui-fg-interactive hover:text-ui-fg-interactive-hover hover:underline"
														title="Variante in neuem Tab öffnen"
													>
														{variant.title || '-'}
													</a>
												) : (
													<Text size="small">{variant.title || '-'}</Text>
												)}
											</td>
											<td className="px-3 py-2">
												{variant.sku ? (
													<a
														href={`/app/inventory?q=${encodeURIComponent(variant.sku)}`}
														target="_blank"
														rel="noopener noreferrer"
														className="font-mono text-xs text-ui-fg-interactive hover:text-ui-fg-interactive-hover hover:underline"
														title="Lagerbestand für diese SKU anzeigen"
													>
														{variant.sku}
													</a>
												) : (
													<Text size="small" className="font-mono text-xs">-</Text>
												)}
											</td>
											<td className="px-3 py-2 text-right">
												<Text size="small">
													{eurPrice > 0 ? `€${eurPrice.toFixed(2)}` : '-'}
												</Text>
											</td>
											<td className="px-3 py-2 text-center">
												<div className="flex justify-center">
													{variant.manage_inventory ? (
														<div
															className="w-2 h-2 rounded-full bg-green-500"
															title="Aktiviert"
														/>
													) : (
														<div
															className="w-2 h-2 rounded-full bg-gray-400"
															title="Deaktiviert"
														/>
													)}
												</div>
											</td>
											<td className="px-3 py-2 text-right">
												<Text size="small" className="font-medium">
													{variant.manage_inventory ? stocked : 'N/A'}
												</Text>
											</td>
											<td className="px-3 py-2 text-right">
												<Text size="small" className={reserved > 0 ? 'text-orange-600 font-medium' : 'text-ui-fg-subtle'}>
													{variant.manage_inventory ? reserved : 'N/A'}
												</Text>
											</td>
											<td className="px-3 py-2 text-center">
												<div className="flex justify-center">
													{variant.allow_backorder ? (
														<div
															className="w-2 h-2 rounded-full bg-blue-500"
															title="Erlaubt"
														/>
													) : (
														<div
															className="w-2 h-2 rounded-full bg-gray-400"
															title="Nicht erlaubt"
														/>
													)}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProductOrganizeTab;
