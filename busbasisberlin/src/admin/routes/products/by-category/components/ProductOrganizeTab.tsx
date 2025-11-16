// busbasisberlin/src/admin/routes/products/by-category/components/ProductOrganizeTab.tsx
// Product organize tab matching core Medusa UI

import {
	Button,
	Checkbox,
	Input,
	Label,
	Select,
	Text,
	Textarea,
} from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

type ProductFormData = {
	discountable?: boolean;
	type_id?: string;
	collection_id?: string;
	category_ids?: string[];
	tags?: string[];
	shipping_profile_id?: string;
	sales_channel_ids?: string[];
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
					console.error('[ProductOrganizeTab] Collections fetch failed:', res.status, res.statusText);
					return [];
				}
				const data = await res.json();
				console.log('[ProductOrganizeTab] Collections API response:', data);
				// API returns { collections: [...] }
				const collections = data?.collections || data?.product_collections || data?.data || (Array.isArray(data) ? data : []);
				const result = Array.isArray(collections) ? collections : [];
				console.log('[ProductOrganizeTab] Parsed collections:', result);
				return result;
			} catch (error) {
				console.error('[ProductOrganizeTab] Error fetching collections:', error);
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
					console.error('[ProductOrganizeTab] Product types fetch failed:', res.status, res.statusText);
					return [];
				}
				const data = await res.json();
				console.log('[ProductOrganizeTab] Product types API response:', data);
				// API returns { product_types: [...] }
				const types = data?.product_types || data?.data || (Array.isArray(data) ? data : []);
				const result = Array.isArray(types) ? types : [];
				console.log('[ProductOrganizeTab] Parsed product types:', result);
				return result;
			} catch (error) {
				console.error('[ProductOrganizeTab] Error fetching product types:', error);
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
					console.error('[ProductOrganizeTab] Shipping profiles fetch failed:', res.status, res.statusText);
					return [];
				}
				const data = await res.json();
				console.log('[ProductOrganizeTab] Shipping profiles API response:', data);
				// API returns { shipping_profiles: [...] }
				const profiles = data?.shipping_profiles || data?.data || (Array.isArray(data) ? data : []);
				const result = Array.isArray(profiles) ? profiles : [];
				console.log('[ProductOrganizeTab] Parsed shipping profiles:', result);
				return result;
			} catch (error) {
				console.error('[ProductOrganizeTab] Error fetching shipping profiles:', error);
				return [];
			}
		},
		initialData: [],
		placeholderData: [],
		retry: 2,
		retryDelay: 1000,
	});

	// Fetch product tags
	const { data: productTagsData = [] } = useQuery({
		queryKey: ['admin-product-tags'],
		queryFn: async () => {
			try {
				const res = await fetch('/admin/product-tags?limit=1000', {
					credentials: 'include',
				});
				if (!res.ok) {
					console.error('[ProductOrganizeTab] Product tags fetch failed:', res.status, res.statusText);
					return [];
				}
				const data = await res.json();
				console.log('[ProductOrganizeTab] Product tags API response:', data);
				// API returns { product_tags: [...] }
				const tags = data?.product_tags || data?.data || (Array.isArray(data) ? data : []);
				const result = Array.isArray(tags) ? tags : [];
				console.log('[ProductOrganizeTab] Parsed product tags:', result);
				return result;
			} catch (error) {
				console.error('[ProductOrganizeTab] Error fetching product tags:', error);
				return [];
			}
		},
		initialData: [],
		placeholderData: [],
		retry: 2,
		retryDelay: 1000,
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
					console.error('[ProductOrganizeTab] Sales channels fetch failed:', res.status, res.statusText);
					return [];
				}
				const data = await res.json();
				console.log('[ProductOrganizeTab] Sales channels API response:', data);
				// API returns { sales_channels: [...] }
				return data?.sales_channels || data?.channels || [];
			} catch (error) {
				console.error('[ProductOrganizeTab] Error fetching sales channels:', error);
				return [];
			}
		},
		initialData: [],
		placeholderData: [],
		retry: 2,
		retryDelay: 1000,
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

	// Get available tags (not already selected)
	const availableTags = Array.isArray(productTagsData)
		? productTagsData.filter(
			(tag: any) => !(formData.tags || []).includes(tag.value),
		)
		: [];

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
					Typ (Optional) {productTypesData?.length > 0 && `(${productTypesData.length})`}
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
								{productTypesData === undefined ? 'Lade Typen...' : 'Keine Typen verfügbar'}
							</div>
						)}
					</Select.Content>
				</Select>
			</div>

			{/* Collection */}
			<div>
				<Label htmlFor="collection" className="mb-2">
					Sammlung (Optional) {collectionsData?.length > 0 && `(${collectionsData.length})`}
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
								console.log('[ProductOrganizeTab] Rendering collection:', collection);
								return (
									<Select.Item key={collection.id} value={collection.id}>
										{collection.title || collection.name || collection.id}
									</Select.Item>
								);
							})
						) : (
							<div className="px-2 py-1.5 text-sm text-ui-fg-subtle">
								{collectionsData === undefined ? 'Lade Sammlungen...' : 'Keine Sammlungen verfügbar'}
							</div>
						)}
					</Select.Content>
				</Select>
			</div>

			{/* Categories */}
			<div>
				<Label className="mb-2">Kategorien (Optional)</Label>
				<div className="border border-ui-border-base rounded-lg p-3 max-h-[200px] overflow-y-auto">
					{categoryTreeData && Array.isArray(categoryTreeData) && categoryTreeData.length > 0 ? (
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
									if (selectedTag) {
										handleAddTag(selectedTag.value);
									}
								}
							}}
						>
							<Select.Trigger>
								<Select.Value placeholder="Existierendes Tag auswählen" />
							</Select.Trigger>
							<Select.Content>
								{availableTags.map((tag: any) => (
									<Select.Item key={tag.id} value={tag.id}>
										{tag.value}
									</Select.Item>
								))}
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
					Shipping profile (Optional) {shippingProfilesData?.length > 0 && `(${shippingProfilesData.length})`}
				</Label>
				<Text size="small" className="text-ui-fg-subtle block mb-2">
					Connect the product to a shipping profile
				</Text>
				<Select
					value={formData.shipping_profile_id || undefined}
					onValueChange={value => {
						console.log('[ProductOrganizeTab] Shipping profile selected:', value);
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
						{Array.isArray(shippingProfilesData) && shippingProfilesData.length > 0 ? (
							shippingProfilesData.map((profile: any) => {
								console.log('[ProductOrganizeTab] Rendering shipping profile:', profile);
								return (
									<Select.Item key={profile.id} value={profile.id}>
										{profile.name || profile.title || profile.id}
									</Select.Item>
								);
							})
						) : (
							<div className="px-2 py-1.5 text-sm text-ui-fg-subtle">
								{shippingProfilesData === undefined ? 'Lade Shipping Profiles...' : 'Keine Shipping Profiles verfügbar'}
							</div>
						)}
					</Select.Content>
				</Select>
			</div>

			{/* Sales Channels */}
			<div>
				<Label className="mb-2">Vertriebskanäle (Optional)</Label>
				<Text size="small" className="text-ui-fg-subtle block mb-3">
					Dieses Produkt ist nur dann im Standard-Vertriebskanal verfügbar,
					wenn es unberührt bleibt.
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
		</div>
	);
};

export default ProductOrganizeTab;

