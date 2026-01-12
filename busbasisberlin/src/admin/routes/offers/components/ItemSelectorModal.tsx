/**
 * ItemSelectorModal.tsx
 * Full-screen modal for selecting products and services to add to offers
 * Top 75%: Category tree + items grid for browsing
 * Bottom 25%: Current offer items table
 */
import { Button, Text, Tabs } from '@medusajs/ui';
import {
	ChevronDown,
	ChevronRight,
	GripHorizontal,
	Package,
	Plus,
	Wrench,
	X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import OfferItemsTable, { OfferItem } from './OfferItemsTable';

// Category tree node structures
type CategoryNode = {
	id: string;
	name: string;
	handle?: string;
	parent_category_id: string | null;
	children: CategoryNode[];
};

type ServiceCategoryNode = {
	name: string;
	path: string;
	count: number;
	children: ServiceCategoryNode[];
	level: number;
};

type Product = {
	id: string;
	title: string;
	handle: string;
	description?: string;
	thumbnail?: string;
	variants: Array<{
		id: string;
		title: string;
		sku: string;
		prices?: Array<{
			amount: number;
			currency_code: string;
		}>;
		price?: {
			amount: number;
			currency_code: string;
		};
		inventory_quantity: number;
	}>;
};

type Service = {
	id: string;
	title: string;
	description: string | null;
	service_code: string | null;
	category: string | null;
	category_level_2: string | null;
	base_price: number | null;
	currency_code: string;
};

type ItemSelectorModalProps = {
	isOpen: boolean;
	onClose: () => void;
	items: OfferItem[];
	onItemsChange: (items: OfferItem[]) => void;
	onItemUpdate: (itemId: string, updates: Partial<OfferItem>) => void;
	onItemRemove: (itemId: string) => void;
	currency?: string;
};

// Product category tree and grid component
function ProductSelector({
	onProductSelect,
}: {
	onProductSelect: (product: Product, variant: Product['variants'][0]) => void;
}) {
	const [categories, setCategories] = useState<CategoryNode[]>([]);
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set(),
	);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingCategories, setLoadingCategories] = useState(false);

	// Fetch product categories on mount
	useEffect(() => {
		fetchCategories();
	}, []);

	const fetchCategories = async () => {
		setLoadingCategories(true);
		try {
			const response = await fetch('/admin/product-categories/tree');
			const data = await response.json();
			setCategories(data.categories || []);
		} catch (error) {
			console.error('Failed to fetch product categories:', error);
		} finally {
			setLoadingCategories(false);
		}
	};

	const fetchProductsByCategory = async (categoryId: string) => {
		setLoading(true);
		try {
			const response = await fetch(
				`/admin/products/by-category?category_id=${categoryId}&limit=100`,
			);
			const data = await response.json();
			setProducts(data.products || []);
		} catch (error) {
			console.error('Failed to fetch products:', error);
			setProducts([]);
		} finally {
			setLoading(false);
		}
	};

	const toggleCategory = (categoryId: string) => {
		setExpandedCategories(prev => {
			const newSet = new Set(prev);
			if (newSet.has(categoryId)) {
				newSet.delete(categoryId);
			} else {
				newSet.add(categoryId);
			}
			return newSet;
		});
	};

	const selectCategory = (categoryId: string) => {
		setSelectedCategory(categoryId);
		fetchProductsByCategory(categoryId);
	};

	const renderCategoryNode = (node: CategoryNode, level: number = 0) => {
		const hasChildren = node.children.length > 0;
		const isExpanded = expandedCategories.has(node.id);
		const isSelected = selectedCategory === node.id;

		return (
			<div key={node.id}>
				<div
					className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-ui-bg-subtle rounded ${
						isSelected ? 'bg-ui-bg-subtle-pressed' : ''
					}`}
					style={{ paddingLeft: `${level * 16 + 8}px` }}
				>
					{hasChildren && (
						<button onClick={() => toggleCategory(node.id)} className="p-0.5">
							{isExpanded ? (
								<ChevronDown className="w-4 h-4" />
							) : (
								<ChevronRight className="w-4 h-4" />
							)}
						</button>
					)}
					{!hasChildren && <div className="w-5" />}
					<Text
						size="small"
						onClick={() => selectCategory(node.id)}
						className="flex-1"
					>
						{node.name}
					</Text>
				</div>
				{hasChildren && isExpanded && (
					<div>
						{node.children.map(child => renderCategoryNode(child, level + 1))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="flex gap-4 h-full">
			{/* Category tree - left sidebar */}
			<div className="w-64 border-r border-ui-border-base pr-4 overflow-y-auto">
				<Text size="small" weight="plus" className="mb-3">
					Produktkategorien
				</Text>
				{loadingCategories ? (
					<div className="flex items-center justify-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ui-fg-base"></div>
					</div>
				) : (
					categories.map(cat => renderCategoryNode(cat))
				)}
			</div>

			{/* Products table - main area */}
			<div className="flex-1 overflow-y-auto">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ui-fg-base"></div>
					</div>
				) : products.length > 0 ? (
					<div className="border border-ui-border-base rounded-lg overflow-hidden">
						<table className="w-full">
							<thead className="bg-ui-bg-subtle border-b border-ui-border-base sticky top-0">
								<tr>
									<th className="text-left p-2 w-16">
										<Text size="xsmall" weight="plus">Bild</Text>
									</th>
									<th className="text-left p-2">
										<Text size="xsmall" weight="plus">Produkt / Variante</Text>
									</th>
									<th className="text-left p-2 w-32">
										<Text size="xsmall" weight="plus">SKU</Text>
									</th>
									<th className="text-right p-2 w-28">
										<Text size="xsmall" weight="plus">Preis</Text>
									</th>
									<th className="text-right p-2 w-24">
										<Text size="xsmall" weight="plus">Lager</Text>
									</th>
								</tr>
							</thead>
							<tbody>
								{products.map(product =>
									product.variants.map(variant => (
										<tr
											key={variant.id}
											className="border-b border-ui-border-base hover:bg-ui-bg-subtle cursor-pointer transition-colors"
											onDoubleClick={() => onProductSelect(product, variant)}
											title="Doppelklick zum Hinzufügen"
										>
											<td className="p-2">
												{product.thumbnail ? (
													<img
														src={product.thumbnail}
														alt={product.title}
														className="w-12 h-12 object-cover rounded border border-ui-border-base"
													/>
												) : (
													<div className="w-12 h-12 bg-ui-bg-base rounded border border-ui-border-base flex items-center justify-center">
														<Package className="w-6 h-6 text-ui-fg-muted" />
													</div>
												)}
											</td>
											<td className="p-2">
												<Text size="small" weight="plus" className="block">
													{product.title}
												</Text>
												<Text size="xsmall" className="text-ui-fg-subtle block mt-0.5">
													{variant.title}
												</Text>
											</td>
											<td className="p-2">
												<Text size="xsmall" className="text-ui-fg-subtle font-mono">
													{variant.sku}
												</Text>
											</td>
											<td className="p-2 text-right">
												<Text size="small" weight="plus">
													{(variant.price?.amount || variant.prices?.find(p => p.currency_code?.toLowerCase() === 'eur')?.amount || 0).toFixed(2)} €
												</Text>
											</td>
											<td className="p-2 text-right">
												<Text size="xsmall" className={variant.inventory_quantity > 0 ? "text-green-600" : "text-red-600"}>
													{variant.inventory_quantity} Stk.
												</Text>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				) : (
					<div className="text-center py-12">
						<Package className="w-12 h-12 text-ui-fg-muted mx-auto mb-3" />
						<Text size="small" className="text-ui-fg-muted">
							{selectedCategory
								? 'Keine Produkte in dieser Kategorie'
								: 'Wählen Sie eine Kategorie aus'}
						</Text>
					</div>
				)}
			</div>
		</div>
	);
}

// Service category tree and grid component
function ServiceSelector({
	onServiceSelect,
}: {
	onServiceSelect: (service: Service) => void;
}) {
	const [categories, setCategories] = useState<ServiceCategoryNode[]>([]);
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set(),
	);
	const [selectedCategoryPath, setSelectedCategoryPath] = useState<
		string | null
	>(null);
	const [services, setServices] = useState<Service[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingCategories, setLoadingCategories] = useState(false);

	// Fetch service categories on mount
	useEffect(() => {
		fetchCategories();
	}, []);

	const fetchCategories = async () => {
		setLoadingCategories(true);
		try {
			const response = await fetch('/admin/service-categories/tree');
			const data = await response.json();
			setCategories(data.categories || []);
		} catch (error) {
			console.error('Failed to fetch service categories:', error);
		} finally {
			setLoadingCategories(false);
		}
	};

	const fetchServicesByCategory = async (categoryPath: string) => {
		setLoading(true);
		try {
			const parts = categoryPath.split(' > ');
			const categoryLevel2 = parts[1] || parts[0];

			const response = await fetch(
				`/admin/services?category=${encodeURIComponent(categoryLevel2)}&limit=100`,
			);
			const data = await response.json();
			setServices(data.services || []);
		} catch (error) {
			console.error('Failed to fetch services:', error);
			setServices([]);
		} finally {
			setLoading(false);
		}
	};

	const toggleCategory = (path: string) => {
		setExpandedCategories(prev => {
			const newSet = new Set(prev);
			if (newSet.has(path)) {
				newSet.delete(path);
			} else {
				newSet.add(path);
			}
			return newSet;
		});
	};

	const selectCategory = (path: string) => {
		setSelectedCategoryPath(path);
		fetchServicesByCategory(path);
	};

	const renderCategoryNode = (node: ServiceCategoryNode, level: number = 0) => {
		const hasChildren = node.children.length > 0;
		const isExpanded = expandedCategories.has(node.path);
		const isSelected = selectedCategoryPath === node.path;

		return (
			<div key={node.path}>
				<div
					className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-ui-bg-subtle rounded ${
						isSelected ? 'bg-ui-bg-subtle-pressed' : ''
					}`}
					style={{ paddingLeft: `${level * 16 + 8}px` }}
				>
					{hasChildren && (
						<button onClick={() => toggleCategory(node.path)} className="p-0.5">
							{isExpanded ? (
								<ChevronDown className="w-4 h-4" />
							) : (
								<ChevronRight className="w-4 h-4" />
							)}
						</button>
					)}
					{!hasChildren && <div className="w-5" />}
					<Text
						size="small"
						onClick={() => selectCategory(node.path)}
						className="flex-1"
					>
						{node.name} ({node.count})
					</Text>
				</div>
				{hasChildren && isExpanded && (
					<div>
						{node.children.map(child => renderCategoryNode(child, level + 1))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="flex gap-4 h-full">
			{/* Category tree - left sidebar */}
			<div className="w-64 border-r border-ui-border-base pr-4 overflow-y-auto">
				<Text size="small" weight="plus" className="mb-3">
					Service-Kategorien
				</Text>
				{loadingCategories ? (
					<div className="flex items-center justify-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ui-fg-base"></div>
					</div>
				) : (
					categories.map(cat => renderCategoryNode(cat))
				)}
			</div>

			{/* Services table - main area */}
			<div className="flex-1 overflow-y-auto">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ui-fg-base"></div>
					</div>
				) : services.length > 0 ? (
					<div className="border border-ui-border-base rounded-lg overflow-hidden">
						<table className="w-full">
							<thead className="bg-ui-bg-subtle border-b border-ui-border-base sticky top-0">
								<tr>
									<th className="text-left p-2 w-32">
										<Text size="xsmall" weight="plus">Code</Text>
									</th>
									<th className="text-left p-2">
										<Text size="xsmall" weight="plus">Service</Text>
									</th>
									<th className="text-left p-2 w-40">
										<Text size="xsmall" weight="plus">Kategorie</Text>
									</th>
									<th className="text-right p-2 w-28">
										<Text size="xsmall" weight="plus">Preis</Text>
									</th>
								</tr>
							</thead>
							<tbody>
								{services.map(service => (
									<tr
										key={service.id}
										className="border-b border-ui-border-base hover:bg-ui-bg-subtle cursor-pointer transition-colors"
										onDoubleClick={() => onServiceSelect(service)}
										title="Doppelklick zum Hinzufügen"
									>
										<td className="p-2">
											<Text size="xsmall" className="text-ui-fg-subtle font-mono">
												{service.service_code || '-'}
											</Text>
										</td>
										<td className="p-2">
											<Text size="small" weight="plus" className="block">
												{service.title}
											</Text>
											{service.description && (
												<Text size="xsmall" className="text-ui-fg-subtle block mt-0.5 line-clamp-1">
													{service.description}
												</Text>
											)}
										</td>
										<td className="p-2">
											<Text size="xsmall" className="text-ui-fg-subtle">
												{service.category_level_2 || service.category || '-'}
											</Text>
										</td>
										<td className="p-2 text-right">
											{service.base_price ? (
												<Text size="small" weight="plus">
													{(service.base_price / 100).toFixed(2)} €
												</Text>
											) : (
												<Text size="xsmall" className="text-ui-fg-muted">-</Text>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="text-center py-12">
						<Wrench className="w-12 h-12 text-ui-fg-muted mx-auto mb-3" />
						<Text size="small" className="text-ui-fg-muted">
							{selectedCategoryPath
								? 'Keine Services in dieser Kategorie'
								: 'Wählen Sie eine Kategorie aus'}
						</Text>
					</div>
				)}
			</div>
		</div>
	);
}

// Minimum heights for sections (in percentage)
const MIN_TOP_HEIGHT = 30;
const MAX_TOP_HEIGHT = 85;
const DEFAULT_TOP_HEIGHT = 65; // Default 65% top, 35% bottom

export default function ItemSelectorModal({
	isOpen,
	onClose,
	items,
	onItemsChange,
	onItemUpdate,
	onItemRemove,
	currency = 'EUR',
}: ItemSelectorModalProps) {
	// Resizable divider state
	const [topHeightPercent, setTopHeightPercent] = useState(() => {
		const stored = localStorage.getItem('itemSelectorModal_topHeight');
		return stored ? parseFloat(stored) : DEFAULT_TOP_HEIGHT;
	});
	const [isDragging, setIsDragging] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Save height to localStorage when it changes
	useEffect(() => {
		localStorage.setItem(
			'itemSelectorModal_topHeight',
			topHeightPercent.toString(),
		);
	}, [topHeightPercent]);

	// Handle mouse down on divider
	const handleDividerMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setIsDragging(true);
		},
		[],
	);

	// Handle mouse move while dragging
	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (e: MouseEvent) => {
			if (!containerRef.current) return;

			const containerRect = containerRef.current.getBoundingClientRect();
			const containerHeight = containerRect.height;
			const mouseY = e.clientY - containerRect.top;

			// Calculate percentage (account for header height ~80px)
			const headerHeight = 80;
			const contentHeight = containerHeight - headerHeight;
			const relativeY = mouseY - headerHeight;
			let newPercent = (relativeY / contentHeight) * 100;

			// Clamp to min/max
			newPercent = Math.max(MIN_TOP_HEIGHT, Math.min(MAX_TOP_HEIGHT, newPercent));
			setTopHeightPercent(newPercent);
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging]);

	// Handler for adding manual items (without product/service reference)
	const handleAddManualItem = () => {
		const newItem: OfferItem = {
			id: Date.now().toString() + Math.random(),
			item_type: 'product', // Default type
			title: '', // User fills in via inline editing
			description: '',
			quantity: 1,
			unit: 'STK',
			unit_price: 0, // User fills in via inline editing
			discount_percentage: 0,
			total_price: 0,
			display_order: items.length,
			// No product_id or service_id = manual item
		};
		onItemsChange([...items, newItem]);
	};

	const handleProductSelect = (
		product: Product,
		variant: Product['variants'][0],
	) => {
		// Get price from variant for offer module (needs cents)
		// variant.price (from /offers/search/products) is already in cents
		// variant.prices (from /products/by-category) is in euros, needs conversion
		let variantPrice = 0;
		if (variant.price?.amount) {
			// Already in cents from the formatted endpoint
			variantPrice = variant.price.amount;
		} else {
			// Raw prices from Medusa are in euros, convert to cents
			const eurPrice = variant.prices?.find(p => p.currency_code?.toLowerCase() === 'eur')?.amount || 0;
			variantPrice = Math.round(eurPrice * 100);
		}

		const newItem: OfferItem = {
			id: Date.now().toString() + Math.random(),
			item_type: 'product',
			title: product.title,
			description: product.description || '',
			quantity: 1,
			unit: 'STK',
			unit_price: variantPrice,
			discount_percentage: 0,
			total_price: variantPrice,
			product_id: product.id,
			variant_id: variant.id,
			sku: variant.sku,
			variant_title: variant.title,
			inventory_quantity: variant.inventory_quantity,
			display_order: items.length,
		};

		onItemsChange([...items, newItem]);
	};

	const handleServiceSelect = (service: Service) => {
		const servicePrice = service.base_price || 0;

		const newItem: OfferItem = {
			id: Date.now().toString() + Math.random(),
			item_type: 'service',
			title: service.title,
			description: service.description || '',
			quantity: 1,
			unit: 'STK',
			unit_price: servicePrice,
			discount_percentage: 0,
			total_price: servicePrice,
			service_id: service.id,
			sku: service.service_code || undefined,
			category: service.category || undefined,
			display_order: items.length,
		};

		onItemsChange([...items, newItem]);
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
			<div
				ref={containerRef}
				className="bg-ui-bg-base rounded-lg w-full h-full max-w-7xl max-h-[90vh] flex flex-col shadow-2xl"
			>
				{/* Modal Header */}
				<div className="flex items-center justify-between p-6 border-b border-ui-border-base shrink-0">
					<div>
						<Text size="xlarge" weight="plus">
							Artikel zum Angebot hinzufügen
						</Text>
						<Text size="small" className="text-ui-fg-subtle mt-1">
							Doppelklick auf Produkte oder Services zum Hinzufügen
						</Text>
					</div>
					<Button variant="transparent" onClick={onClose}>
						<X className="w-5 h-5" />
					</Button>
				</div>

				{/* Resizable content area */}
				<div className="flex-1 flex flex-col min-h-0">
					{/* Top Section: Item Browser */}
					<div
						className="p-6 overflow-hidden"
						style={{ height: `${topHeightPercent}%` }}
					>
						<Tabs defaultValue="products" className="h-full flex flex-col">
							<Tabs.List className="mb-4 shrink-0">
								<Tabs.Trigger value="products" className="flex items-center gap-2">
									<Package className="w-4 h-4" />
									Produkte
								</Tabs.Trigger>
								<Tabs.Trigger value="services" className="flex items-center gap-2">
									<Wrench className="w-4 h-4" />
									Services
								</Tabs.Trigger>
							</Tabs.List>

							<Tabs.Content value="products" className="flex-1 overflow-hidden">
								<ProductSelector onProductSelect={handleProductSelect} />
							</Tabs.Content>

							<Tabs.Content value="services" className="flex-1 overflow-hidden">
								<ServiceSelector onServiceSelect={handleServiceSelect} />
							</Tabs.Content>
						</Tabs>
					</div>

					{/* Resizable Divider */}
					<div
						className={`shrink-0 h-2 bg-ui-border-base hover:bg-ui-bg-interactive cursor-row-resize flex items-center justify-center transition-colors ${
							isDragging ? 'bg-ui-bg-interactive' : ''
						}`}
						onMouseDown={handleDividerMouseDown}
					>
						<GripHorizontal className="w-4 h-4 text-ui-fg-muted" />
					</div>

					{/* Bottom Section: Selected Items */}
					<div
						className="p-6 overflow-hidden flex flex-col bg-ui-bg-subtle"
						style={{ height: `${100 - topHeightPercent}%` }}
					>
						<div className="flex items-center justify-between mb-4 shrink-0">
							<Text size="large" weight="plus">
								Ausgewählte Artikel ({items.length})
							</Text>
							<Button onClick={onClose} variant="secondary">
								Fertig
							</Button>
						</div>
						<div className="flex-1 overflow-auto min-h-0">
							<OfferItemsTable
								items={items}
								onItemsChange={onItemsChange}
								onItemUpdate={onItemUpdate}
								onItemRemove={onItemRemove}
								currency={currency}
							/>
						</div>
						{/* Add manual item button */}
						<Button
							variant="secondary"
							onClick={handleAddManualItem}
							className="mt-3 shrink-0"
						>
							<Plus className="w-4 h-4 mr-2" />
							Artikel hinzufügen
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}


