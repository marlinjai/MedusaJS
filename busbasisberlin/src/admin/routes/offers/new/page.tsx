/**
 * new/page.tsx
 * Create new offer page with full-screen modal item selection
 * German UI with modern tree-based product/service selection
 */
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { ArrowLeft, Plus } from 'lucide-react';
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
import ItemSelectorModal from '../components/ItemSelectorModal';
import OfferItemsTable from '../components/OfferItemsTable';
import SearchableDropdown from '../components/SearchableDropdown';

// Searchable item for customer dropdown
interface SearchableItem {
	id: string;
	title?: string;
	display_name?: string;
	name?: string;
	email?: string;
	phone?: string;
	mobile?: string;
	address?: string;
	[key: string]: any;
}

// Offer item interface - matches the one in ItemSelectorSplitView
interface OfferItem {
	id: string;
	item_type: 'product' | 'service';
	title: string;
	description: string;
	quantity: number;
	unit: string;
	unit_price: number;
	discount_percentage: number;
	total_price: number;
	product_id?: string;
	service_id?: string;
	sku?: string;
	variant_id?: string;
	variant_title?: string;
	category?: string;
	inventory_quantity?: number;
	display_order?: number;
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
	const [showItemSelector, setShowItemSelector] = useState(false);
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
			// Prepare request body with customer IDs based on selection
			const requestBody: any = {
				...formData,
				items: formData.items.map(item => ({
					...item,
					unit_price: Math.round(item.unit_price), // Already in cents
				})),
			};

			// Add customer IDs if a customer was selected
			if (formData.selected_customer) {
				if (formData.selected_customer.core_customer_id) {
					requestBody.core_customer_id = formData.selected_customer.core_customer_id;
				}
				if (formData.selected_customer.manual_customer_id) {
					requestBody.manual_customer_id = formData.selected_customer.manual_customer_id;
				}
			}

			const response = await fetch('/admin/offers', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
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

				{/* Artikel Section */}
				<div className="bg-ui-bg-subtle rounded-lg p-6">
					<div className="flex items-center justify-between mb-4">
						<Text size="large" weight="plus" className="text-ui-fg-base">
							Artikel
						</Text>
						<Button
							type="button"
							variant="secondary"
							size="small"
							onClick={() => setShowItemSelector(true)}
						>
							<Plus className="w-4 h-4 mr-2" />
							Artikel hinzufügen
						</Button>
					</div>

					<OfferItemsTable
						items={formData.items}
						onItemsChange={items => setFormData(prev => ({ ...prev, items }))}
						onItemUpdate={updateItem}
						onItemRemove={removeItem}
						currency={formData.currency_code}
					/>
				</div>

				{/* Item Selector Modal */}
				<ItemSelectorModal
					isOpen={showItemSelector}
					onClose={() => setShowItemSelector(false)}
					items={formData.items}
					onItemsChange={items => setFormData(prev => ({ ...prev, items }))}
					onItemUpdate={updateItem}
					onItemRemove={removeItem}
					currency={formData.currency_code}
				/>

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
