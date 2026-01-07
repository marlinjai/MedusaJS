/**
 * SearchableDropdown.tsx
 * Reusable searchable dropdown component for offer creation
 * Supports customers, products, and services with search functionality
 */
import { Input, Text } from '@medusajs/ui';
import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SearchableItem {
	id: string;
	title?: string;
	display_name?: string;
	name?: string;
	type?: string;
	[key: string]: any;
}

interface SearchableDropdownProps {
	label: string;
	placeholder: string;
	value: string;
	onValueChange: (value: string) => void;
	onItemSelect: (item: SearchableItem) => void;
	searchEndpoint: string;
	searchQuery?: string;
	onSearchQueryChange?: (query: string) => void;
	disabled?: boolean;
	className?: string;
	itemType: 'customer' | 'product' | 'service';
}

const SearchableDropdown = ({
	label,
	placeholder,
	onValueChange,
	onItemSelect,
	searchEndpoint,
	searchQuery = '',
	onSearchQueryChange,
	disabled = false,
	className = '',
	itemType,
}: SearchableDropdownProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [items, setItems] = useState<SearchableItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedItem, setSelectedItem] = useState<SearchableItem | null>(null);
	const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

	// Reset state when searchEndpoint changes (e.g., switching between product/service)
	useEffect(() => {
		setItems([]);
		setSelectedItem(null);
		setLocalSearchQuery('');
		setIsOpen(false);
		if (onSearchQueryChange) {
			onSearchQueryChange('');
		}
	}, [searchEndpoint, onSearchQueryChange]);

	// Debounced search effect
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (localSearchQuery.length >= 2 || localSearchQuery.length === 0) {
				performSearch(localSearchQuery);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [localSearchQuery]);

	// Sync external search query
	useEffect(() => {
		if (searchQuery !== localSearchQuery) {
			setLocalSearchQuery(searchQuery);
		}
	}, [searchQuery]);

	const performSearch = async (query: string) => {
		if (!query.trim() && query.length > 0) return;

		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (query.trim()) params.append('q', query.trim());
			params.append('limit', '50');

			const response = await fetch(`${searchEndpoint}?${params.toString()}`, {
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error('Search failed');
			}

			const data = await response.json();

			// Handle different response structures
			let searchResults: SearchableItem[] = [];
			if (data.customers) {
				searchResults = data.customers;
			} else if (data.products) {
				searchResults = data.products;
			} else if (data.services) {
				searchResults = data.services;
			} else if (data.items) {
				searchResults = data.items;
			}

			setItems(searchResults);
		} catch (error) {
			console.error('Search error:', error);
			setItems([]);
		} finally {
			setLoading(false);
		}
	};

	const handleItemSelect = (item: SearchableItem) => {
		setSelectedItem(item);
		onItemSelect(item);
		setIsOpen(false);
		setLocalSearchQuery('');
		if (onSearchQueryChange) {
			onSearchQueryChange('');
		}
	};

	const handleClear = () => {
		setSelectedItem(null);
		onValueChange('');
		setLocalSearchQuery('');
		if (onSearchQueryChange) {
			onSearchQueryChange('');
		}
	};

	const getDisplayName = (item: SearchableItem): string => {
		return item.display_name || item.title || item.name || 'Unbekannt';
	};

	const getSubtitle = (item: SearchableItem): string => {
		switch (itemType) {
			case 'customer':
				return [item.email, item.phone, item.customer_number]
					.filter(Boolean)
					.join(' • ');
			case 'product':
				// Convert cents to euros for display
				const productPrice = item.unit_price
					? `${(item.unit_price / 100).toFixed(2)} €`
					: null;
				// Show category and price
				return [item.category, productPrice]
					.filter(Boolean)
					.join(' • ');
			case 'service':
				// Convert cents to euros for display
				const servicePrice = item.base_price
					? `${(item.base_price / 100).toFixed(2)} €`
					: null;
				return [item.category, item.service_type, servicePrice]
					.filter(Boolean)
					.join(' • ');
			default:
				return '';
		}
	};

	// Get product ID for display (last 8 characters)
	const getProductId = (item: SearchableItem): string | null => {
		if (itemType === 'product' && item.id) {
			return item.id.slice(-8);
		}
		return null;
	};

	const getItemTypeBadge = (item: SearchableItem): string => {
		switch (itemType) {
			case 'customer':
				if (item.customer_source === 'linked') return 'Verknüpft';
				if (item.customer_source === 'core') return 'Online';
				return 'Manuell';
			case 'product':
				return 'Prod';
			case 'service':
				return 'Serv';
			default:
				return '';
		}
	};

	const getItemTypeColor = (item: SearchableItem): string => {
		switch (itemType) {
			case 'customer':
				if (item.customer_source === 'linked') return 'purple';
				if (item.customer_source === 'core') return 'green';
				return 'blue';
			case 'product':
				return 'purple';
			case 'service':
				return 'orange';
			default:
				return 'grey';
		}
	};

	return (
		<div className={`relative ${className}`}>
			<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
				{label}
			</Text>

			<div className="relative">
				<Input
					placeholder={placeholder}
					value={selectedItem ? getDisplayName(selectedItem) : localSearchQuery}
					onChange={e => {
						if (!selectedItem) {
							setLocalSearchQuery(e.target.value);
							if (onSearchQueryChange) {
								onSearchQueryChange(e.target.value);
							}
						}
					}}
					onFocus={() => {
						if (!selectedItem) {
							setIsOpen(true);
						}
					}}
					disabled={disabled}
					className="cursor-pointer"
				/>

				{/* Clear button */}
				{selectedItem && (
					<button
						onClick={handleClear}
						className="absolute right-2 top-1/2 transform -translate-y-1/2 text-ui-fg-muted hover:text-ui-fg-base"
					>
						<X className="w-4 h-4" />
					</button>
				)}

				{/* Search icon */}
				{!selectedItem && (
					<Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ui-fg-muted" />
				)}
			</div>

			{/* Dropdown */}
			{isOpen && !selectedItem && (
				<div className="absolute top-full left-0 right-0 mt-1 bg-ui-bg-base border border-ui-border-base rounded-md shadow-elevation-flyout z-50 max-h-96 overflow-y-auto">
					{loading && (
						<div className="flex items-center gap-3 px-3 py-2 text-ui-fg-subtle">
							<div className="animate-spin rounded-full h-4 w-4 border-2 border-ui-border-base border-t-ui-fg-base"></div>
							<Text size="small" className="text-ui-fg-subtle">
								Suche läuft...
							</Text>
						</div>
					)}

					{!loading && items.length === 0 && localSearchQuery.length > 0 && (
						<div className="px-3 py-2">
							<Text size="small" className="text-ui-fg-muted">
								Keine Ergebnisse gefunden
							</Text>
						</div>
					)}

					{!loading && items.length === 0 && localSearchQuery.length === 0 && (
						<div className="px-3 py-2">
							<Text size="small" className="text-ui-fg-muted">
								Geben Sie mindestens 2 Zeichen ein, um zu suchen
							</Text>
						</div>
					)}

					{!loading &&
						items.map(item => (
							<div
								key={item.id}
								className="px-3 py-2 hover:bg-ui-bg-subtle cursor-pointer transition-colors duration-150 border-b border-ui-border-base last:border-b-0 first:rounded-t-md last:rounded-b-md"
								onClick={() => handleItemSelect(item)}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1 flex-wrap">
											<Text
												size="small"
												weight="plus"
												className="text-ui-fg-base break-words"
											>
												{getDisplayName(item)}
											</Text>
											<div
												className={`px-1.5 py-0.5 text-xs rounded-full bg-ui-tag-${getItemTypeColor(item)}-bg text-ui-tag-${getItemTypeColor(item)}-text flex-shrink-0`}
											>
												{getItemTypeBadge(item)}
											</div>
										</div>
										<Text size="xsmall" className="text-ui-fg-subtle break-words">
											{getSubtitle(item)}
										</Text>
									</div>
									{getProductId(item) && (
										<div className="flex-shrink-0">
											<Text size="xsmall" className="text-ui-fg-muted font-mono">
												{getProductId(item)}
											</Text>
										</div>
									)}
								</div>
							</div>
						))}
				</div>
			)}

			{/* Click outside to close */}
			{isOpen && (
				<div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
			)}
		</div>
	);
};

export default SearchableDropdown;
