// busbasisberlin/src/admin/routes/products/by-category/components/ProductOrganizeTab.tsx
// Product organize tab matching core Medusa UI

import { Button, Checkbox, Input, Label, Select, Text } from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

type Variant = {
	id?: string;
	title?: string;
	sku?: string;
	manage_inventory?: boolean;
	allow_backorder?: boolean;
	prices?: Array<{ amount: number; currency_code: string }>;
	price_eur?: number;
	price_europe?: number;
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
					console.error(
						'[ProductOrganizeTab] Shipping profiles fetch failed:',
						res.status,
						res.statusText,
					);
					return [];
				}
				const data = await res.json();
				console.log(
					'[ProductOrganizeTab] Shipping profiles API response:',
					data,
				);
				// API returns { shipping_profiles: [...] }
				const profiles =
					data?.shipping_profiles ||
					data?.data ||
					(Array.isArray(data) ? data : []);
				const result = Array.isArray(profiles) ? profiles : [];
				console.log('[ProductOrganizeTab] Parsed shipping profiles:', result);
				return result;
			} catch (error) {
				console.error(
					'[ProductOrganizeTab] Error fetching shipping profiles:',
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

	// Fetch categories tree and flatten it
	const { data: categoryTreeData } = useQuery({
		queryKey: ['admin-category-tree'],
		queryFn: async () => {
			const res = await fetch('/admin/product-categories/tree', {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch category tree');
			const { categories } = await res.json();

			// Flatten the tree structure to a flat array for display
			const flattenCategories = (nodes: any[]): any[] => {
				const result: any[] = [];
				const traverse = (node: any, level = 0) => {
					result.push({ ...node, level });
					if (node.children && node.children.length > 0) {
						node.children.forEach((child: any) => traverse(child, level + 1));
					}
				};
				(nodes || []).forEach(node => traverse(node));
				return result;
			};

			return flattenCategories(categories || []);
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

	// Fetch inventory data for variants if product ID exists
	const { data: inventoryData } = useQuery({
		queryKey: ['product-variant-inventory', formData.id],
		queryFn: async () => {
			if (
				!formData.id ||
				!formData.variants ||
				formData.variants.length === 0
			) {
				return {};
			}

			try {
				// Fetch inventory for each variant
				const inventoryPromises = formData.variants.map(async variant => {
					if (!variant.id) {
						return { variantId: variant.id, quantity: 0 };
					}

					const res = await fetch(
						`/admin/inventory-items?variant_id=${variant.id}`,
						{
							credentials: 'include',
						},
					);

					if (!res.ok) {
						console.error(
							`Failed to fetch inventory for variant ${variant.id}`,
						);
						return { variantId: variant.id, quantity: 0 };
					}

					const data = await res.json();
					const inventoryItems = data?.inventory_items || [];
					const totalQuantity = inventoryItems.reduce(
						(sum: number, item: any) => {
							const levels = item.location_levels || [];
							return (
								sum +
								levels.reduce((levelSum: number, level: any) => {
									return levelSum + (level.stocked_quantity || 0);
								}, 0)
							);
						},
						0,
					);

					return { variantId: variant.id, quantity: totalQuantity };
				});

				const results = await Promise.all(inventoryPromises);
				const inventoryMap: Record<string, number> = {};

				results.forEach(result => {
					if (result.variantId) {
						inventoryMap[result.variantId] = result.quantity;
					}
				});

				return inventoryMap;
			} catch (error) {
				console.error('Error fetching inventory:', error);
				return {};
			}
		},
		enabled:
			!!formData.id && !!formData.variants && formData.variants.length > 0,
		initialData: {},
		staleTime: 30000, // 30 seconds
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
				<div className="border border-ui-border-base rounded-lg p-3 max-h-[200px] overflow-y-auto">
					{categoryTreeData &&
					Array.isArray(categoryTreeData) &&
					categoryTreeData.length > 0 ? (
						<div className="space-y-1">
							{categoryTreeData.map((category: any) => (
								<div
									key={category.id}
									className="flex items-center gap-2"
									style={{ paddingLeft: `${(category.level || 0) * 16}px` }}
								>
									<Checkbox
										checked={(formData.category_ids || []).includes(
											category.id,
										)}
										onCheckedChange={checked => {
											const currentIds = formData.category_ids || [];
											if (checked) {
												onChange({
													...formData,
													category_ids: [...currentIds, category.id],
												});
											} else {
												onChange({
													...formData,
													category_ids: currentIds.filter(
														id => id !== category.id,
													),
												});
											}
										}}
									/>
									<Text size="small">{category.name}</Text>
								</div>
							))}
						</div>
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
						console.log(
							'[ProductOrganizeTab] Shipping profile selected:',
							value,
						);
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
							shippingProfilesData.map((profile: any) => {
								console.log(
									'[ProductOrganizeTab] Rendering shipping profile:',
									profile,
								);
								return (
									<Select.Item key={profile.id} value={profile.id}>
										{profile.name || profile.title || profile.id}
									</Select.Item>
								);
							})
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
									<th className="text-right px-3 py-2 text-sm font-medium text-ui-fg-base">
										Preis Europe
									</th>
									<th className="text-center px-3 py-2 text-sm font-medium text-ui-fg-base">
										Bestandsverwaltung
									</th>
									<th className="text-right px-3 py-2 text-sm font-medium text-ui-fg-base">
										Bestand
									</th>
									<th className="text-center px-3 py-2 text-sm font-medium text-ui-fg-base">
										Rückstand zulassen
									</th>
								</tr>
							</thead>
							<tbody>
								{formData.variants.map((variant, index) => {
									// Use flat price fields (already transformed from Medusa format in ProductEditorModal)
									// price_eur and price_europe are in euros (not cents)
									const eurPrice = variant.price_eur ?? 0;
									const europePrice = variant.price_europe ?? 0;

									const inventory = variant.id
										? inventoryData?.[variant.id] || 0
										: 0;

									return (
										<tr
											key={variant.id || index}
											className="border-b border-ui-border-base last:border-b-0 hover:bg-ui-bg-subtle-hover"
										>
											<td className="px-3 py-2">
												<Text size="small">{variant.title || '-'}</Text>
											</td>
											<td className="px-3 py-2">
												<Text size="small" className="font-mono text-xs">
													{variant.sku || '-'}
												</Text>
											</td>
											<td className="px-3 py-2 text-right">
												<Text size="small">
													{eurPrice > 0 ? `€${eurPrice.toFixed(2)}` : '-'}
												</Text>
											</td>
											<td className="px-3 py-2 text-right">
												<Text size="small">
													{europePrice > 0 ? `€${europePrice.toFixed(2)}` : '-'}
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
													{variant.manage_inventory ? inventory : 'N/A'}
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
