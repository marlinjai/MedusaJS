/**
 * new/page.tsx
 * Create new offer page with comprehensive form
 * German UI following the same pattern as suppliers/services
 */
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
	Button,
	Container,
	Input,
	Select,
	Text,
	Textarea,
	toast,
} from '@medusajs/ui';
import SearchableDropdown from '../components/SearchableDropdown';
import VariantSelector from '../components/VariantSelector';

interface SearchableItem {
	id: string;
	title?: string;
	display_name?: string;
	name?: string;
	type?: string;
	variants?: Array<{
		id: string;
		title: string;
		sku: string;
		// Support both old prices array and new single price object
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
	variants_count?: number;
	[key: string]: any;
}

interface ProductVariant {
	id: string;
	title: string;
	sku: string;
	// Support both old prices array and new single price object
	prices?: Array<{
		amount: number;
		currency_code: string;
	}>;
	price?: {
		amount: number;
		currency_code: string;
	};
	inventory_quantity: number;
}

interface OfferItem {
	id: string;
	item_type: 'product' | 'service';
	title: string;
	description: string;
	quantity: number;
	unit: string;
	unit_price: number; // already gross
	discount_percentage: number;
	total_price: number;
	// New fields for selected items
	product_id?: string;
	service_id?: string;
	sku?: string;
	variant_id?: string;
	variant_title?: string;
	base_price?: number;
	hourly_rate?: number;
	currency_code?: string;
	inventory_quantity?: number;
	category?: string;
	service_type?: string;
	// Product selection state
	selectedProduct?: SearchableItem;
}

interface OfferFormData {
	description: string;
	customer_name: string;
	customer_email: string;
	customer_phone: string;
	customer_address: string;
	valid_until: string;
	internal_notes: string;
	customer_notes: string;
	currency_code: string;
	items: OfferItem[];
	// Customer selection
	selected_customer?: SearchableItem;
}

export const config = defineRouteConfig({
	label: 'Neues Angebot',
});

export default function CreateOfferPage() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	// Add local state for price input values to allow natural typing
	const [priceInputStates, setPriceInputStates] = useState<
		Record<string, string>
	>({});
	const [formData, setFormData] = useState<OfferFormData>({
		description: '',
		customer_name: '',
		customer_email: '',
		customer_phone: '',
		customer_address: '',
		valid_until: '',
		internal_notes: '',
		customer_notes: '',
		currency_code: 'EUR',
		items: [],
	});

	// Email notification preferences (per-offer)
	const [emailNotifications, setEmailNotifications] = useState({
		offer_created: true,
		offer_active: true,
		offer_accepted: true,
		offer_completed: true,
		offer_cancelled: true,
	});

	// Handle customer selection
	const handleCustomerSelect = (customer: SearchableItem) => {
		setFormData(prev => ({
			...prev,
			selected_customer: customer,
			customer_name:
				customer.display_name || customer.title || customer.name || '',
			customer_email: customer.email || '',
			customer_phone: customer.phone || customer.mobile || '',
			customer_address: customer.address || '',
		}));
	};

	// Handle product selection for an item
	const handleProductSelect = (itemId: string, product: SearchableItem) => {
		setFormData(prev => ({
			...prev,
			items: prev.items.map(item =>
				item.id === itemId
					? {
							...item,
							item_type: 'product',
							title: product.title || product.name || '',
							description: product.description || '',
							product_id: product.id,
							selectedProduct: product,
							// Reset variant-specific fields - will be set when variant is selected
							variant_id: undefined,
							variant_title: undefined,
							sku: undefined,
							unit_price: 0,
							inventory_quantity: undefined,
							category: product.category,
							total_price: 0,
						}
					: item,
			),
		}));
	};

	// Handle variant selection for a product item
	const handleVariantSelect = (itemId: string, variant: ProductVariant) => {
		// Get unit price from variant (supports both old prices array and new single price object)
		const getVariantPrice = (variant: ProductVariant): number => {
			// New API format: single price object
			if (variant.price) {
				return variant.price.amount;
			}

			// Old API format: prices array
			if (variant.prices && variant.prices.length > 0) {
				// Find EUR price first, then fall back to first available
				const eurPrice = variant.prices.find(p => p.currency_code === 'EUR');
				return eurPrice ? eurPrice.amount : variant.prices[0].amount;
			}

			return 0;
		};

		const unitPrice = getVariantPrice(variant);
		// Log the price for debugging
		console.log('[PRICE-TRACE] handleVariantSelect:', {
			variant,
			variantPriceAmount: variant.price?.amount,
			unitPriceSet: unitPrice,
		});

		setFormData(prev => ({
			...prev,
			items: prev.items.map(item =>
				item.id === itemId
					? {
							...item,
							variant_id: variant.id,
							variant_title: variant.title,
							sku: variant.sku,
							unit_price: unitPrice,
							inventory_quantity: variant.inventory_quantity,
							currency_code: 'EUR',
							total_price: calculateItemTotal({
								...item,
								variant_id: variant.id,
								variant_title: variant.title,
								sku: variant.sku,
								unit_price: unitPrice,
								inventory_quantity: variant.inventory_quantity,
							}),
						}
					: item,
			),
		}));

		// Sync the price input state with the new variant price
		setPriceInputStates(prev => ({
			...prev,
			[itemId]: (unitPrice / 100).toFixed(2),
		}));
	};

	// Handle price input blur - convert to proper format and update model
	const handlePriceBlur = (itemId: string, inputValue: string) => {
		if (!inputValue.trim()) {
			setPriceInputStates(prev => ({ ...prev, [itemId]: '' }));
			updateItem(itemId, { unit_price: undefined });
			return;
		}

		// Parse the input value and convert to cents
		const num = Number(inputValue.replace(',', '.'));
		if (!isNaN(num) && num >= 0) {
			const cents = Math.round(num * 100);
			updateItem(itemId, { unit_price: cents });
			// Format the display value
			setPriceInputStates(prev => ({ ...prev, [itemId]: num.toFixed(2) }));
		} else {
			// Invalid input, reset to current model value
			const currentItem = formData.items.find(item => item.id === itemId);
			const displayValue = currentItem?.unit_price
				? (currentItem.unit_price / 100).toFixed(2)
				: '';
			setPriceInputStates(prev => ({ ...prev, [itemId]: displayValue }));
		}
	};

	// Handle service selection for an item
	const handleServiceSelect = (itemId: string, service: SearchableItem) => {
		const servicePrice = service.base_price || service.hourly_rate || 0;

		setFormData(prev => ({
			...prev,
			items: prev.items.map(item =>
				item.id === itemId
					? {
							...item,
							item_type: 'service',
							title: service.title || service.name || '',
							description:
								service.description || service.short_description || '',
							service_id: service.id,
							base_price: servicePrice, // Already in cents from API
							hourly_rate: service.hourly_rate || 0,
							currency_code: service.currency_code || 'EUR',
							category: service.category,
							service_type: service.service_type,
							unit_price: servicePrice, // Already in cents from API
							total_price: calculateItemTotal({
								...item,
								item_type: 'service',
								title: service.title || service.name || '',
								unit_price: servicePrice,
							}),
						}
					: item,
			),
		}));

		// Sync the price input state with the new service price
		setPriceInputStates(prev => ({
			...prev,
			[itemId]: (servicePrice / 100).toFixed(2),
		}));
	};

	// Add new item to the offer
	const addItem = () => {
		const newItem: OfferItem = {
			id: Date.now().toString(),
			item_type: 'product',
			title: '',
			description: '',
			quantity: 1,
			unit: 'STK',
			unit_price: 0,
			discount_percentage: 0,
			total_price: 0,
		};
		setFormData(prev => ({
			...prev,
			items: [...prev.items, newItem],
		}));
	};

	// Remove item from the offer
	const removeItem = (itemId: string) => {
		setFormData(prev => ({
			...prev,
			items: prev.items.filter(item => item.id !== itemId),
		}));
	};

	// Update item in the offer
	const updateItem = (itemId: string, updates: Partial<OfferItem>) => {
		setFormData(prev => ({
			...prev,
			items: prev.items.map(item =>
				item.id === itemId
					? {
							...item,
							...updates,
							total_price: calculateItemTotal({ ...item, ...updates }),
						}
					: item,
			),
		}));
	};

	// Calculate total price for an item
	const calculateItemTotal = (item: OfferItem): number => {
		const subtotal = item.unit_price * item.quantity;
		const discount = subtotal * (item.discount_percentage / 100);
		return subtotal - discount;
	};

	// Calculate offer totals with proper tax-inclusive pricing
	const calculateOfferTotals = () => {
		// Calculate gross total (tax-inclusive)
		const grossTotal = formData.items.reduce(
			(sum, item) => sum + calculateItemTotal(item),
			0,
		);

		// Calculate net total (tax-exclusive) - 19% VAT
		const netTotal = Math.round(grossTotal / 1.19);

		// Calculate VAT amount
		const vatAmount = grossTotal - netTotal;

		// Calculate total discount
		const totalDiscount = formData.items.reduce((sum, item) => {
			const itemSubtotal = item.unit_price * item.quantity;
			const itemDiscount = itemSubtotal * (item.discount_percentage / 100);
			return sum + itemDiscount;
		}, 0);

		return {
			subtotal: netTotal,
			discount_amount: totalDiscount,
			vat_amount: vatAmount,
			total: grossTotal,
		};
	};

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.items.length) {
			toast.error('Mindestens ein Artikel ist erforderlich');
			return;
		}

		// Validate that product items have variants selected (only for linked products)
		const productItemsWithoutVariants = formData.items.filter(
			item =>
				item.item_type === 'product' &&
				item.selectedProduct &&
				(!item.variant_id || !item.selectedProduct),
		);

		if (productItemsWithoutVariants.length > 0) {
			toast.error(
				'Bitte wählen Sie für alle verknüpften Produkte eine Variante aus.',
			);
			return;
		}

		// Validate that all items have required fields
		const invalidItems = formData.items.filter(item => {
			// For manual products: only require title, quantity, and unit_price
			if (!item.product_id && !item.service_id) {
				return (
					!item.title ||
					item.quantity <= 0 ||
					!item.unit_price ||
					item.unit_price <= 0
				);
			}
			// For linked products/services: require title, quantity, unit_price, and variant_id (for products)
			if (item.item_type === 'product') {
				return (
					!item.title ||
					item.quantity <= 0 ||
					!item.unit_price ||
					item.unit_price <= 0 ||
					!item.variant_id
				);
			}
			// For services: require title, quantity, and unit_price
			return (
				!item.title ||
				item.quantity <= 0 ||
				!item.unit_price ||
				item.unit_price <= 0
			);
		});

		if (invalidItems.length > 0) {
			toast.error(
				'Bitte füllen Sie alle erforderlichen Felder für alle Artikel aus.',
			);
			return;
		}

		setLoading(true);

		try {
			const response = await fetch('/admin/offers', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...formData,
					email_notifications: emailNotifications,
					items: formData.items.map(item => ({
						...item,
						unit_price: Math.round(item.unit_price), // Already in cents
					})),
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Fehler beim Erstellen des Angebots');
			}

			await response.json(); // Get response but don't store it
			toast.success('Angebot erfolgreich erstellt');
			navigate('/offers');
		} catch (error) {
			console.error('Error creating offer:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Fehler beim Erstellen des Angebots',
			);
		} finally {
			setLoading(false);
		}
	};

	const totals = calculateOfferTotals();

	return (
		<Container>
			<div className="flex items-center gap-4 mb-6">
				<Button
					variant="secondary"
					size="small"
					onClick={() => navigate('/offers')}
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Zurück
				</Button>
				<div>
					<Text size="xlarge" weight="plus" className="text-ui-fg-base">
						Neues Angebot erstellen
					</Text>
					<Text size="small" className="text-ui-fg-subtle">
						Erstellen Sie ein neues Angebot für einen Kunden
					</Text>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-8">
				{/* Basic Information */}
				<div className="bg-ui-bg-subtle rounded-lg p-6">
					<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
						Grundinformationen
					</Text>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
								Währung
							</Text>
							<Select
								value={formData.currency_code}
								onValueChange={value =>
									setFormData(prev => ({ ...prev, currency_code: value }))
								}
							>
								<Select.Trigger>
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="EUR">EUR</Select.Item>
									<Select.Item value="USD">USD</Select.Item>
								</Select.Content>
							</Select>
						</div>

						<div className="md:col-span-2">
							<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
								Beschreibung
							</Text>
							<Textarea
								value={formData.description}
								onChange={e =>
									setFormData(prev => ({
										...prev,
										description: e.target.value,
									}))
								}
								placeholder="Detaillierte Beschreibung des Angebots"
								rows={3}
							/>
						</div>

						<div>
							<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
								Gültig bis
							</Text>
							<Input
								type="date"
								value={formData.valid_until}
								onChange={e =>
									setFormData(prev => ({
										...prev,
										valid_until: e.target.value,
									}))
								}
							/>
						</div>
					</div>
				</div>

				{/* Customer Information */}
				<div className="bg-ui-bg-subtle rounded-lg p-6">
					<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
						Kundeninformationen
					</Text>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="md:col-span-2">
							<SearchableDropdown
								label="Kunde auswählen"
								placeholder="Kunde suchen (Name, E-Mail, Telefon)..."
								value={formData.selected_customer?.id || ''}
								onValueChange={() => {}}
								onItemSelect={handleCustomerSelect}
								searchEndpoint="/admin/offers/search/customers"
								itemType="customer"
							/>
						</div>

						<div>
							<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
								Kundenname
							</Text>
							<Input
								type="text"
								value={formData.customer_name}
								onChange={e =>
									setFormData(prev => ({
										...prev,
										customer_name: e.target.value,
									}))
								}
								placeholder="Firmenname oder Privatperson"
							/>
						</div>

						<div>
							<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
								E-Mail
							</Text>
							<Input
								type="email"
								value={formData.customer_email}
								onChange={e =>
									setFormData(prev => ({
										...prev,
										customer_email: e.target.value,
									}))
								}
								placeholder="kunde@beispiel.de"
							/>
						</div>

						<div>
							<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
								Telefon
							</Text>
							<Input
								type="tel"
								value={formData.customer_phone}
								onChange={e =>
									setFormData(prev => ({
										...prev,
										customer_phone: e.target.value,
									}))
								}
								placeholder="+49 123 456789"
							/>
						</div>

						<div>
							<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
								Adresse
							</Text>
							<Textarea
								value={formData.customer_address}
								onChange={e =>
									setFormData(prev => ({
										...prev,
										customer_address: e.target.value,
									}))
								}
								placeholder="Straße, PLZ Ort"
								rows={2}
							/>
						</div>
					</div>
				</div>

				{/* Email Notifications */}
				<div className="bg-ui-bg-subtle rounded-lg p-6">
					<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
						E-Mail Benachrichtigungen
					</Text>
					<Text size="small" className="text-ui-fg-subtle mb-4">
						Diese Einstellungen gelten nur für dieses Angebot und überschreiben die globalen Einstellungen.
					</Text>

					<div className="space-y-3">
						{[
							{ key: 'offer_created' as const, label: 'Angebot erstellt' },
							{ key: 'offer_active' as const, label: 'Angebot aktiv' },
							{ key: 'offer_accepted' as const, label: 'Angebot angenommen' },
							{ key: 'offer_completed' as const, label: 'Angebot abgeschlossen' },
							{ key: 'offer_cancelled' as const, label: 'Angebot storniert' }
						].map(({ key, label }) => (
							<label key={key} className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={emailNotifications[key]}
									onChange={(e) => setEmailNotifications(prev => ({
										...prev,
										[key]: e.target.checked
									}))}
									className="w-4 h-4 rounded border-ui-border-base"
								/>
								<Text size="small">{label}</Text>
							</label>
						))}
					</div>
				</div>

				{/* Items */}
				<div className="bg-ui-bg-subtle rounded-lg p-6">
					<div className="flex items-center justify-between mb-4">
						<Text size="large" weight="plus" className="text-ui-fg-base">
							Artikel
						</Text>
						<Button
							type="button"
							variant="secondary"
							size="small"
							onClick={addItem}
						>
							<Plus className="w-4 h-4 mr-2" />
							Artikel hinzufügen
						</Button>
					</div>

					{formData.items.length === 0 ? (
						<div className="text-center py-8">
							<Text size="small" className="text-ui-fg-muted">
								Keine Artikel vorhanden. Klicken Sie auf "Artikel hinzufügen",
								um zu beginnen.
							</Text>
						</div>
					) : (
						<div className="space-y-4">
							{formData.items.map(item => (
								<div
									key={item.id}
									className="border border-ui-border-base rounded-lg p-4"
								>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
										{/* Item Type Selection */}
										<div>
											<Text
												size="small"
												weight="plus"
												className="text-ui-fg-base mb-2"
											>
												Artikeltyp
											</Text>
											<Select
												value={item.item_type}
												onValueChange={value =>
													updateItem(item.id, {
														item_type: value as 'product' | 'service',
													})
												}
											>
												<Select.Trigger>
													<Select.Value />
												</Select.Trigger>
												<Select.Content>
													<Select.Item value="product">Produkt</Select.Item>
													<Select.Item value="service">Service</Select.Item>
												</Select.Content>
											</Select>
										</div>

										{/* Item Selection */}
										<div>
											{item.item_type === 'product' ? (
												<SearchableDropdown
													key={`product-${item.id}`}
													label="Produkt auswählen"
													placeholder="Produkt suchen..."
													value={item.product_id || ''}
													onValueChange={() => {}}
													onItemSelect={product =>
														handleProductSelect(item.id, product)
													}
													searchEndpoint="/admin/offers/search/products"
													itemType="product"
												/>
											) : (
												<SearchableDropdown
													key={`service-${item.id}`}
													label="Service auswählen"
													placeholder="Service suchen..."
													value={item.service_id || ''}
													onValueChange={() => {}}
													onItemSelect={service =>
														handleServiceSelect(item.id, service)
													}
													searchEndpoint="/admin/offers/search/services"
													itemType="service"
												/>
											)}
										</div>
									</div>

									{/* Variant Selection for Products */}
									{item.item_type === 'product' && item.selectedProduct && (
										<div className="mb-4">
											<VariantSelector
												product={item.selectedProduct}
												selectedVariantId={item.variant_id || null}
												onVariantSelect={variant =>
													handleVariantSelect(item.id, variant)
												}
												disabled={!item.selectedProduct}
											/>
											{item.selectedProduct && !item.variant_id && (
												<div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
													<Text size="small" className="text-orange-700">
														⚠️ Bitte wählen Sie eine Variante für dieses Produkt
														aus
													</Text>
												</div>
											)}
										</div>
									)}

									{/* Item Details */}
									<div className="grid grid-cols-2 md:grid-cols-6 gap-4">
										<div>
											<Text
												size="small"
												weight="plus"
												className="text-ui-fg-base mb-2"
											>
												Titel
											</Text>
											<Input
												type="text"
												value={item.title}
												onChange={e =>
													updateItem(item.id, { title: e.target.value })
												}
												placeholder="Artikelname"
											/>
										</div>

										<div>
											<Text
												size="small"
												weight="plus"
												className="text-ui-fg-base mb-2"
											>
												Menge
											</Text>
											<Input
												type="number"
												value={item.quantity}
												onChange={e =>
													updateItem(item.id, {
														quantity: Number(e.target.value),
													})
												}
												min="1"
											/>
										</div>

										<div>
											<Text
												size="small"
												weight="plus"
												className="text-ui-fg-base mb-2"
											>
												Einheit
											</Text>
											<Input
												type="text"
												value={item.unit}
												onChange={e =>
													updateItem(item.id, { unit: e.target.value })
												}
												placeholder="STK"
											/>
										</div>

										<div>
											<Text
												size="small"
												weight="plus"
												className="text-ui-fg-base mb-2"
											>
												Preis (€)
											</Text>
											{/* Price input with natural typing behavior - updates on blur */}
											<Input
												type="number"
												value={
													priceInputStates[item.id] ||
													(item.unit_price
														? (item.unit_price / 100).toFixed(2)
														: '')
												}
												onChange={e => {
													const val = e.target.value;
													// Only update the local input state - don't update the model yet
													setPriceInputStates(prev => ({
														...prev,
														[item.id]: val,
													}));
												}}
												onBlur={() =>
													handlePriceBlur(
														item.id,
														priceInputStates[item.id] || '',
													)
												}
												min="0"
												step="0.01"
												inputMode="decimal"
												disabled={Boolean(
													item.item_type === 'product' && item.variant_id,
												)}
												className={
													item.item_type === 'product' && item.variant_id
														? 'bg-gray-100'
														: ''
												}
											/>
											{/* Netto price in euros */}
											<Text size="xsmall" className="text-ui-fg-subtle mt-1">
												Netto:{' '}
												{(item.unit_price
													? item.unit_price / 1.19 / 100
													: 0
												).toFixed(2)}{' '}
												€
											</Text>
											{item.item_type === 'product' && item.variant_id && (
												<Text size="xsmall" className="text-ui-fg-subtle mt-1">
													Preis von Variante übernommen
												</Text>
											)}
										</div>

										<div>
											<Text
												size="small"
												weight="plus"
												className="text-ui-fg-base mb-2"
											>
												Rabatt %
											</Text>
											<Input
												type="number"
												value={item.discount_percentage}
												onChange={e =>
													updateItem(item.id, {
														discount_percentage: Number(e.target.value),
													})
												}
												min="0"
												max="100"
											/>
										</div>
									</div>

									{/* Item Description */}
									<div className="mt-4">
										<Text
											size="small"
											weight="plus"
											className="text-ui-fg-base mb-2"
										>
											Beschreibung
										</Text>
										<Textarea
											value={item.description}
											onChange={e =>
												updateItem(item.id, { description: e.target.value })
											}
											placeholder="Artikelbeschreibung"
											rows={2}
										/>
									</div>

									{/* Item Summary */}
									<div className="flex items-center justify-between mt-4 pt-4 border-t border-ui-border-base">
										<div className="flex items-center gap-4">
											{item.sku && (
												<Text size="small" className="text-ui-fg-subtle">
													SKU: {item.sku}
												</Text>
											)}
											{item.category && (
												<Text size="small" className="text-ui-fg-subtle">
													Kategorie: {item.category}
												</Text>
											)}
											{item.inventory_quantity !== undefined && (
												<Text size="small" className="text-ui-fg-subtle">
													Lager: {item.inventory_quantity}
												</Text>
											)}
											{item.variant_title && (
												<Text size="small" className="text-ui-fg-subtle">
													Variante: {item.variant_title}
												</Text>
											)}
										</div>
										<div className="flex items-center gap-4">
											<Text size="small" weight="plus">
												Summe: {(calculateItemTotal(item) / 100).toFixed(2)} €
											</Text>
											<Button
												type="button"
												variant="transparent"
												size="small"
												onClick={() => removeItem(item.id)}
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Totals */}
				{formData.items.length > 0 && (
					<div className="bg-ui-bg-subtle rounded-lg p-6">
						<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
							Gesamtsumme
						</Text>
						<div className="space-y-2">
							<div className="flex justify-between">
								<Text size="small" className="text-ui-fg-subtle">
									Nettobetrag:
								</Text>
								<Text size="small" weight="plus">
									{totals.subtotal
										? (totals.subtotal / 100).toFixed(2)
										: '0.00'}{' '}
									€
								</Text>
							</div>
							{totals.discount_amount > 0 && (
								<div className="flex justify-between">
									<Text size="small" className="text-ui-fg-subtle">
										Rabatt:
									</Text>
									<Text size="small" weight="plus" className="text-red-600">
										-{(totals.discount_amount / 100).toFixed(2)} €
									</Text>
								</div>
							)}
							<div className="flex justify-between">
								<Text size="small" className="text-ui-fg-subtle">
									MwSt. (19%):
								</Text>
								<Text size="small" weight="plus">
									{totals.vat_amount
										? (totals.vat_amount / 100).toFixed(2)
										: '0.00'}{' '}
									€
								</Text>
							</div>
							<div className="flex justify-between border-t border-ui-border-base pt-2">
								<Text size="base" weight="plus" className="text-ui-fg-base">
									Gesamtsumme:
								</Text>
								<Text size="base" weight="plus" className="text-ui-fg-base">
									{totals.total ? (totals.total / 100).toFixed(2) : '0.00'} €
								</Text>
							</div>
							<Text size="small" className="text-ui-fg-subtle mt-1">
								Alle Preise inklusive 19% MwSt.
							</Text>
						</div>
					</div>
				)}

				{/* Notes */}
				<div className="bg-ui-bg-subtle rounded-lg p-6">
					<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
						Zusätzliche Informationen
					</Text>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
								Interne Notizen
							</Text>
							<Textarea
								value={formData.internal_notes}
								onChange={e =>
									setFormData(prev => ({
										...prev,
										internal_notes: e.target.value,
									}))
								}
								placeholder="Notizen für interne Verwendung"
								rows={3}
							/>
						</div>

						<div>
							<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
								Kundennotizen
							</Text>
							<Textarea
								value={formData.customer_notes}
								onChange={e =>
									setFormData(prev => ({
										...prev,
										customer_notes: e.target.value,
									}))
								}
								placeholder="Notizen für den Kunden"
								rows={3}
							/>
						</div>
					</div>
				</div>

				{/* Submit */}
				<div className="flex justify-end gap-4">
					<Button
						type="button"
						variant="secondary"
						onClick={() => navigate('/offers')}
					>
						Abbrechen
					</Button>
					<Button type="submit" disabled={loading}>
						{loading ? 'Wird erstellt...' : 'Angebot erstellen'}
					</Button>
				</div>
			</form>
		</Container>
	);
}
