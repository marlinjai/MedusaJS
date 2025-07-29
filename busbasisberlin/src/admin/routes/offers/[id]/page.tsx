/**
 * [id]/page.tsx
 * Offer detail page for viewing and editing offers
 * Includes status management, item editing, and comprehensive information display
 */
import { ArrowLeft, Edit, FileText, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
	Badge,
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
	variants?: Array<ProductVariant>;
	variants_count?: number;
	[key: string]: any;
}

interface ProductVariant {
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
}

interface OfferItem {
	id: string;
	item_type: 'product' | 'service';
	title: string;
	description: string;
	quantity: number;
	unit: string;
	unit_price: number; // Already gross (tax-inclusive)
	discount_percentage: number;
	tax_rate: number; // Default 19% for products
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

interface Offer {
	id: string;
	offer_number: string;
	description: string;
	status: 'draft' | 'active' | 'accepted' | 'completed' | 'cancelled';
	customer_name: string;
	customer_email: string;
	customer_phone: string;
	customer_address: string;
	subtotal: number;
	tax_amount: number;
	total_amount: number;
	currency_code: string;
	valid_until: string;
	internal_notes: string;
	customer_notes: string;
	created_at: string;
	updated_at: string;
	items: OfferItem[];
	has_reservations: boolean;
}

// Dynamic routes with parameters cannot be added to sidebar menu
// This route is accessed through navigation from the main offers page

export default function OfferDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [offer, setOffer] = useState<Offer | null>(null);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(false);
	const [updating, setUpdating] = useState(false);
	const [saving, setSaving] = useState(false);

	// Add local state for price input values to allow natural typing
	const [priceInputStates, setPriceInputStates] = useState<
		Record<string, string>
	>({});

	// Add inventory checking state
	const [inventoryStatus, setInventoryStatus] = useState<{
		can_complete: boolean;
		has_out_of_stock: boolean;
		has_low_stock: boolean;
		items: Array<{
			item_id: string;
			available_quantity: number;
			is_available: boolean;
			stock_status: string;
		}>;
	} | null>(null);
	const [checkingInventory, setCheckingInventory] = useState(false);
	const [generatingPDF, setGeneratingPDF] = useState(false);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [pdfFilename, setPdfFilename] = useState<string>('');

	// Load offer data
	useEffect(() => {
		if (id) {
			loadOffer();
		}
	}, [id]);

	const loadOffer = async () => {
		try {
			const response = await fetch(`/admin/offers/${id}`);
			if (!response.ok) {
				throw new Error('Angebot nicht gefunden');
			}
			const data = await response.json();
			setOffer(data.offer);

			// Initialize price input states
			const priceStates: Record<string, string> = {};
			data.offer.items.forEach((item: OfferItem) => {
				priceStates[item.id] = (item.unit_price / 100).toFixed(2);
			});
			setPriceInputStates(priceStates);
		} catch (error) {
			console.error('Error loading offer:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Fehler beim Laden des Angebots',
			);
			navigate('/offers');
		} finally {
			setLoading(false);
		}
	};

	// Check inventory availability for offer items
	const checkInventoryAvailability = async () => {
		if (!offer) return;

		setCheckingInventory(true);
		try {
			const response = await fetch(`/admin/offers/${offer.id}/check-inventory`);
			if (!response.ok) {
				throw new Error('Fehler beim Prüfen der Inventarverfügbarkeit');
			}
			const data = await response.json();
			setInventoryStatus(data);
		} catch (error) {
			console.error('Error checking inventory:', error);
			toast.error('Fehler beim Prüfen der Inventarverfügbarkeit');
		} finally {
			setCheckingInventory(false);
		}
	};

	// Generate PDF for offer
	const generatePDF = async () => {
		if (!offer) return;

		setGeneratingPDF(true);
		try {
			const response = await fetch(`/admin/offers/${offer.id}/generate-pdf`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error('PDF generation failed');
			}

			const filename = `${offer.offer_number}.pdf`;

			// Set URL to server endpoint for cached PDF (no blob needed)
			const cachedPdfUrl = `/admin/offers/${offer.id}/get-cached-pdf`;
			setPdfUrl(cachedPdfUrl);
			setPdfFilename(filename);

			// Open PDF in new tab using server endpoint
			window.open(cachedPdfUrl, '_blank', 'noopener,noreferrer');

			toast.success('PDF wurde erfolgreich erstellt');
		} catch (error) {
			console.error('PDF generation error:', error);
			toast.error('Fehler beim Erstellen der PDF');
		} finally {
			setGeneratingPDF(false);
		}
	};

	// Cleanup PDF URL when component unmounts or offer changes
	// Cleanup PDF URL on unmount (only for blob URLs)
	useEffect(() => {
		return () => {
			if (pdfUrl && pdfUrl.startsWith('blob:')) {
				URL.revokeObjectURL(pdfUrl);
			}
		};
	}, [pdfUrl]);

	// Check for cached PDF when offer loads
	const checkCachedPDF = async (offerId: string) => {
		try {
			const response = await fetch(
				`/admin/offers/${offerId}/get-cached-pdf?action=check`,
			);
			if (response.ok) {
				const data = await response.json();
				if (data.exists && data.isRecent) {
					// Set URL to server endpoint for cached PDF
					const cachedPdfUrl = `/admin/offers/${offerId}/get-cached-pdf`;
					setPdfUrl(cachedPdfUrl);
					setPdfFilename(`${offer?.offer_number || 'OFFER'}.pdf`);
				}
			}
		} catch (error) {
			console.log('No cached PDF found:', error);
			// Silent fail - not having a cached PDF is normal
		}
	};

	// Clear PDF when offer changes and check for cached version
	useEffect(() => {
		if (pdfUrl && pdfUrl.startsWith('blob:')) {
			URL.revokeObjectURL(pdfUrl);
		}
		setPdfUrl(null);
		setPdfFilename('');

		// Check for cached PDF if offer exists
		if (offer?.id) {
			checkCachedPDF(offer.id);
		}
	}, [offer?.id]);

	// Load inventory status when offer loads or changes
	useEffect(() => {
		if (
			offer &&
			offer.items.some(item => item.item_type === 'product' && item.variant_id)
		) {
			// Check inventory immediately after offer loads
			checkInventoryAvailability();
		}
	}, [offer?.id, offer?.items?.length, offer?.items]); // Re-run when offer ID changes or items change

	// Update offer status
	const updateStatus = async (newStatus: string) => {
		if (!offer) return;

		setUpdating(true);
		try {
			// ✅ Use new workflow-based API for status transitions
			const response = await fetch(
				`/admin/offers/${offer.id}/transition-status`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						offer_id: offer.id,
						new_status: newStatus,
						user_id: 'admin', // TODO: Get actual user ID from context
					}),
				},
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.error ||
						error.message ||
						'Fehler beim Aktualisieren des Status',
				);
			}

			const result = await response.json();

			// ✅ Handle new workflow response format
			if (result.success) {
				// Reload the offer to get updated data
				await loadOffer();
				toast.success('Status erfolgreich aktualisiert');

				// Refresh inventory status after status change
				if (
					newStatus === 'accepted' ||
					newStatus === 'completed' ||
					newStatus === 'active'
				) {
					checkInventoryAvailability();
				}
			} else {
				throw new Error(result.error || 'Fehler beim Aktualisieren des Status');
			}
		} catch (error) {
			console.error('Error updating status:', error);
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Fehler beim Aktualisieren des Status';

			// Show specific inventory error messages
			if (errorMessage.includes('out of stock')) {
				toast.error(`❌ ${errorMessage}`);
			} else {
				toast.error(errorMessage);
			}
		} finally {
			setUpdating(false);
		}
	};

	// ✅ Fulfill offer (complete and reduce inventory)
	const fulfillOffer = async () => {
		if (!offer) return;

		setUpdating(true);
		try {
			const response = await fetch(`/admin/offers/${offer.id}/fulfill`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					offer_id: offer.id,
					user_id: 'admin', // TODO: Get actual user ID from context
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.error ||
						error.message ||
						'Fehler beim Abschließen des Angebots',
				);
			}

			const result = await response.json();

			if (result.success) {
				// Reload the offer to get updated data
				await loadOffer();
				toast.success('Angebot erfolgreich abgeschlossen');
			} else {
				throw new Error(result.error || 'Fehler beim Abschließen des Angebots');
			}
		} catch (error) {
			console.error('Error fulfilling offer:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Fehler beim Abschließen des Angebots',
			);
		} finally {
			setUpdating(false);
		}
	};

	// Save offer changes
	const saveOffer = async () => {
		if (!offer) return;

		setSaving(true);
		try {
			const response = await fetch(`/admin/offers/${offer.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...offer,
					items: offer.items.map(item => ({
						...item,
						unit_price: Math.round(item.unit_price), // Already in cents
					})),
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.error || error.message || 'Fehler beim Speichern des Angebots',
				);
			}

			const result = await response.json();

			// ✅ Handle new API response format
			if (result.success) {
				setOffer(result.offer);
				setEditing(false);
				toast.success('Angebot erfolgreich gespeichert');
			} else {
				throw new Error(result.error || 'Fehler beim Speichern des Angebots');
			}
		} catch (error) {
			console.error('Error saving offer:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Fehler beim Speichern des Angebots',
			);
		} finally {
			setSaving(false);
		}
	};

	// Get status display text
	const getStatusText = (status: string): string => {
		switch (status) {
			case 'draft':
				return 'Entwurf';
			case 'active':
				return 'Aktiv';
			case 'accepted':
				return 'Angenommen';
			case 'completed':
				return 'Abgeschlossen';
			case 'cancelled':
				return 'Storniert';
			default:
				return status;
		}
	};

	// Get status color
	const getStatusColor = (status: string) => {
		switch (status) {
			case 'draft':
				return 'grey' as const;
			case 'active':
				return 'blue' as const;
			case 'accepted':
				return 'green' as const;
			case 'completed':
				return 'green' as const;
			case 'cancelled':
				return 'red' as const;
			default:
				return 'grey' as const;
		}
	};

	// ✅ Get available status transitions with workflow support
	const getAvailableStatusTransitions = (currentStatus: string): string[] => {
		const transitions: { [key: string]: string[] } = {
			draft: ['active', 'cancelled'],
			active: ['accepted', 'cancelled'],
			accepted: ['completed', 'cancelled'], // Can now be fulfilled via workflow
			completed: [], // Cannot transition from completed
			cancelled: [], // Cannot transition from cancelled
		};
		return transitions[currentStatus] || [];
	};

	// Get inventory status for a specific item
	const getItemInventoryStatus = (itemId: string) => {
		if (!inventoryStatus) return null;
		return inventoryStatus.items.find(item => item.item_id === itemId);
	};

	// Handle product selection for an item
	const handleProductSelect = (itemId: string, product: SearchableItem) => {
		if (!offer) return;

		setOffer(prev => {
			if (!prev) return prev;
			return {
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
								tax_rate: 19, // Default 19% VAT for products
								inventory_quantity: undefined,
								category: product.category,
								total_price: 0,
							}
						: item,
				),
			};
		});
	};

	// Handle variant selection for a product item
	const handleVariantSelect = (itemId: string, variant: ProductVariant) => {
		if (!offer) return;

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

		setOffer(prev => {
			if (!prev) return prev;
			return {
				...prev,
				items: prev.items.map(item =>
					item.id === itemId
						? {
								...item,
								variant_id: variant.id,
								variant_title: variant.title,
								sku: variant.sku,
								unit_price: unitPrice,
								tax_rate: 19, // Default 19% VAT for products
								inventory_quantity: variant.inventory_quantity, // Use cached value initially
								currency_code: 'EUR',
								total_price: calculateItemTotal({
									...item,
									variant_id: variant.id,
									variant_title: variant.title,
									sku: variant.sku,
									unit_price: unitPrice,
									tax_rate: 19,
									inventory_quantity: variant.inventory_quantity,
								}),
							}
						: item,
				),
			};
		});

		// Sync the price input state with the new variant price
		setPriceInputStates(prev => ({
			...prev,
			[itemId]: (unitPrice / 100).toFixed(2),
		}));

		// Refresh inventory status immediately after variant selection to get real-time data
		setTimeout(() => checkInventoryAvailability(), 200);
	};

	// Handle service selection for an item
	const handleServiceSelect = (itemId: string, service: SearchableItem) => {
		if (!offer) return;

		const servicePrice = service.base_price || service.hourly_rate || 0;

		setOffer(prev => {
			if (!prev) return prev;
			return {
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
								tax_rate: 19, // Default 19% VAT for services
								total_price: calculateItemTotal({
									...item,
									item_type: 'service',
									title: service.title || service.name || '',
									unit_price: servicePrice,
									tax_rate: 19,
								}),
							}
						: item,
				),
			};
		});

		// Sync the price input state with the new service price
		setPriceInputStates(prev => ({
			...prev,
			[itemId]: (servicePrice / 100).toFixed(2),
		}));
	};

	// Handle price input blur - convert to proper format and update model
	const handlePriceBlur = (itemId: string, inputValue: string) => {
		if (!offer) return;

		if (!inputValue.trim()) {
			setPriceInputStates(prev => ({ ...prev, [itemId]: '' }));
			updateItem(itemId, { unit_price: 0 });
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
			const currentItem = offer.items.find(item => item.id === itemId);
			const displayValue = currentItem?.unit_price
				? (currentItem.unit_price / 100).toFixed(2)
				: '';
			setPriceInputStates(prev => ({ ...prev, [itemId]: displayValue }));
		}
	};

	// Add new item to the offer
	const addItem = () => {
		if (!offer) return;

		const newItem: OfferItem = {
			id: Date.now().toString(),
			item_type: 'product',
			title: '',
			description: '',
			quantity: 1,
			unit: 'STK',
			unit_price: 0,
			discount_percentage: 0,
			tax_rate: 19, // Default 19% VAT
			total_price: 0,
		};

		setOffer(prev => {
			if (!prev) return prev;
			return {
				...prev,
				items: [...prev.items, newItem],
			};
		});
	};

	// Remove item from the offer
	const removeItem = (itemId: string) => {
		if (!offer) return;

		setOffer(prev => {
			if (!prev) return prev;
			return {
				...prev,
				items: prev.items.filter(item => item.id !== itemId),
			};
		});
	};

	// Update item in the offer
	const updateItem = (itemId: string, updates: Partial<OfferItem>) => {
		if (!offer) return;

		setOffer(prev => {
			if (!prev) return prev;
			return {
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
			};
		});
	};

	// Calculate total price for an item
	const calculateItemTotal = (item: OfferItem): number => {
		const subtotal = item.unit_price * item.quantity;
		const discount = subtotal * (item.discount_percentage / 100);
		return subtotal - discount;
	};

	// Calculate offer totals with proper tax-inclusive pricing
	const calculateOfferTotals = () => {
		if (!offer) return { subtotal: 0, tax: 0, total: 0 };

		// Calculate gross total (tax-inclusive)
		const grossTotal = offer.items.reduce(
			(sum, item) => sum + calculateItemTotal(item),
			0,
		);

		// Calculate net total (tax-exclusive) - 19% VAT
		const netTotal = Math.round(grossTotal / 1.19);

		// Calculate VAT amount
		const vatAmount = grossTotal - netTotal;

		return {
			subtotal: netTotal,
			tax: vatAmount,
			total: grossTotal,
		};
	};

	if (loading) {
		return (
			<Container>
				<div className="flex items-center justify-center h-64">
					<Text size="small" className="text-ui-fg-muted">
						Wird geladen...
					</Text>
				</div>
			</Container>
		);
	}

	if (!offer) {
		return (
			<Container>
				<div className="flex items-center justify-center h-64">
					<Text size="small" className="text-ui-fg-muted">
						Angebot nicht gefunden
					</Text>
				</div>
			</Container>
		);
	}

	const availableTransitions = getAvailableStatusTransitions(offer.status);
	const totals = calculateOfferTotals();

	return (
		<Container>
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Button
						variant="secondary"
						size="small"
						onClick={() => navigate('/offers')}
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Zurück
					</Button>
					<div>
						<div className="flex items-center gap-3">
							<Text size="xlarge" weight="plus" className="text-ui-fg-base">
								{offer.offer_number}
							</Text>
							{offer.has_reservations && (
								<Badge color="orange">Reserviert</Badge>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex items-center gap-2">
						<Badge color={getStatusColor(offer.status)}>
							{getStatusText(offer.status)}
						</Badge>
						{inventoryStatus?.has_out_of_stock && (
							<Badge color="red" size="small">
								⚠️ Artikel nicht verfügbar
							</Badge>
						)}
						{inventoryStatus?.has_low_stock &&
							!inventoryStatus?.has_out_of_stock && (
								<Badge color="orange" size="small">
									⚠️ Niedriger Lagerbestand
								</Badge>
							)}
						{availableTransitions.length > 0 && (
							<div className="relative">
								<Select
									value=""
									onValueChange={updateStatus}
									disabled={updating}
								>
									<Select.Trigger className="w-auto">
										<Select.Value placeholder="Status ändern" />
									</Select.Trigger>
									<Select.Content>
										{availableTransitions.map(status => (
											<Select.Item
												key={status}
												value={status}
												disabled={
													status === 'completed' && inventoryStatus
														? !inventoryStatus.can_complete
														: false
												}
											>
												<div className="flex items-center gap-2">
													<span>{getStatusText(status)}</span>
													{status === 'completed' &&
														inventoryStatus &&
														!inventoryStatus.can_complete && (
															<span className="text-red-500 text-xs">
																⚠️ Nicht verfügbar
															</span>
														)}
												</div>
											</Select.Item>
										))}
									</Select.Content>
								</Select>
								{inventoryStatus &&
									!inventoryStatus.can_complete &&
									availableTransitions.includes('completed') && (
										<div className="absolute top-full left-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 whitespace-nowrap z-10">
											⚠️ Angebot kann nicht abgeschlossen werden - Artikel nicht
											verfügbar
										</div>
									)}
							</div>
						)}

						{/* ✅ Fulfill button for accepted offers */}
						{offer.status === 'accepted' && (
							<Button
								variant="primary"
								size="small"
								onClick={fulfillOffer}
								disabled={updating}
								className="px-3"
							>
								{updating ? 'Abschließen...' : 'Abschließen'}
							</Button>
						)}
					</div>
					{/* ✅ Only show edit button if offer is not in final state */}
					{offer.status !== 'completed' && offer.status !== 'cancelled' && (
						<>
							<Button
								variant="secondary"
								size="small"
								onClick={() => setEditing(!editing)}
								disabled={saving}
								className={editing ? 'px-6' : ''}
							>
								<Edit className="w-full h-4 mr-2" />
								{editing ? 'Bearbeitung beenden' : 'Bearbeiten'}
							</Button>
							{editing && (
								<Button
									variant="primary"
									size="small"
									onClick={saveOffer}
									disabled={saving}
									className="px-3"
								>
									{saving ? 'Speichern...' : 'Speichern'}
								</Button>
							)}
						</>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-8 space-y-6">
					{/* Basic Information */}
					<div className="bg-ui-bg-subtle rounded-lg p-6">
						<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
							Grundinformationen
						</Text>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Text
									size="small"
									weight="plus"
									className="text-ui-fg-base mb-2"
								>
									Gültig bis
								</Text>
								{editing ? (
									<Input
										type="date"
										value={offer.valid_until}
										onChange={e =>
											setOffer(prev =>
												prev ? { ...prev, valid_until: e.target.value } : prev,
											)
										}
									/>
								) : (
									<Text size="small" className="text-ui-fg-base">
										{offer.valid_until
											? new Date(offer.valid_until).toLocaleDateString('de-DE')
											: 'Nicht festgelegt'}
									</Text>
								)}
							</div>

							<div className="md:col-span-2">
								<Text
									size="small"
									weight="plus"
									className="text-ui-fg-base mb-2"
								>
									Beschreibung
								</Text>
								{editing ? (
									<Textarea
										value={offer.description}
										onChange={e =>
											setOffer(prev =>
												prev ? { ...prev, description: e.target.value } : prev,
											)
										}
										rows={3}
									/>
								) : (
									<Text size="small" className="text-ui-fg-base">
										{offer.description || 'Keine Beschreibung'}
									</Text>
								)}
							</div>
						</div>
					</div>

					{/* Items */}
					<div className="bg-ui-bg-subtle rounded-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<Text size="large" weight="plus" className="text-ui-fg-base">
								Artikel
							</Text>
							{editing && (
								<Button
									type="button"
									variant="secondary"
									size="small"
									onClick={addItem}
								>
									<Plus className="w-4 h-4 mr-2" />
									Artikel hinzufügen
								</Button>
							)}
						</div>

						{offer.items.length === 0 ? (
							<div className="text-center py-8">
								<Text size="small" className="text-ui-fg-muted">
									Keine Artikel vorhanden.
								</Text>
							</div>
						) : (
							<div className="space-y-4">
								{offer.items.map(item => (
									<div
										key={item.id}
										className="border border-ui-border-base rounded-lg p-4"
									>
										{editing ? (
											<>
												{/* Editing Mode - Full Form */}
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
																<Select.Item value="product">
																	Produkt
																</Select.Item>
																<Select.Item value="service">
																	Service
																</Select.Item>
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
												{item.item_type === 'product' &&
													item.selectedProduct && (
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
																	<Text
																		size="small"
																		className="text-orange-700"
																	>
																		⚠️ Bitte wählen Sie eine Variante für dieses
																		Produkt aus
																	</Text>
																</div>
															)}
														</div>
													)}

												{/* Item Details */}
												<div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
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
														<Text
															size="xsmall"
															className="text-ui-fg-subtle mt-1"
														>
															Netto:{' '}
															{(item.unit_price
																? item.unit_price / 1.19 / 100
																: 0
															).toFixed(2)}{' '}
															€
														</Text>
														{item.item_type === 'product' &&
															item.variant_id && (
																<Text
																	size="xsmall"
																	className="text-ui-fg-subtle mt-1"
																>
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

													<div>
														<Text
															size="small"
															weight="plus"
															className="text-ui-fg-base mb-2"
														>
															USt. %
														</Text>
														<Input
															type="number"
															value={item.tax_rate}
															onChange={e =>
																updateItem(item.id, {
																	tax_rate: Number(e.target.value),
																})
															}
															min="0"
															max="100"
														/>
													</div>
												</div>

												{/* Description */}
												<div className="mb-4">
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
															updateItem(item.id, {
																description: e.target.value,
															})
														}
														placeholder="Artikelbeschreibung"
														rows={2}
													/>
												</div>

												{/* Delete Button - Editing Mode */}
												<div className="flex justify-end pt-2 border-t border-ui-border-base">
													<Button
														type="button"
														variant="transparent"
														size="small"
														onClick={() => removeItem(item.id)}
													>
														<Trash2 className="w-4 h-4 mr-2" />
														Artikel entfernen
													</Button>
												</div>
											</>
										) : (
											<>
												{/* Display Mode - Compact 3-Row Layout */}
												{/* Row 1: Title with Item Type Badge */}
												<div className="flex items-center gap-3 mb-2">
													<Badge
														color={
															item.item_type === 'product' ? 'blue' : 'green'
														}
														size="small"
													>
														{item.item_type === 'product'
															? 'Produkt'
															: 'Service'}
													</Badge>
													<Text
														size="base"
														weight="plus"
														className="text-ui-fg-base"
													>
														{item.title || 'Kein Titel'}
													</Text>
												</div>

												{/* Row 2: Description */}
												<div className="mb-3">
													<Text size="small" className="text-ui-fg-muted">
														{item.description || 'Keine Beschreibung'}
													</Text>
												</div>

												{/* Row 3: Compact Details Summary */}
												<div className="flex items-center justify-between py-2 px-3 bg-ui-bg-field rounded-md">
													<div className="flex items-center gap-4 flex-wrap min-w-0 flex-1">
														<Text size="small" className="text-ui-fg-subtle">
															{item.quantity} {item.unit} ×{' '}
															{(item.unit_price / 100).toFixed(2)} €
														</Text>
														{item.discount_percentage > 0 && (
															<Text size="small" className="text-ui-fg-subtle">
																-{item.discount_percentage}% Rabatt
															</Text>
														)}
														{item.sku && (
															<div className="flex-shrink-0">
																<Text
																	size="small"
																	className="text-ui-fg-subtle"
																>
																	SKU:
																	{item.variant_id ? (
																		<a
																			href={`/app/inventory?q=${encodeURIComponent(item.sku)}`}
																			className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover ml-1"
																			target="_blank"
																			rel="noopener noreferrer"
																			title="Lagerbestand für diese SKU anzeigen"
																		>
																			{item.sku}
																		</a>
																	) : (
																		<span className="ml-1">{item.sku}</span>
																	)}
																</Text>
															</div>
														)}
														{/* Stock info for active offers only */}
														{!['completed', 'cancelled'].includes(
															offer.status,
														) &&
															(item.inventory_quantity !== undefined ||
																getItemInventoryStatus(item.id)) && (
																<div className="flex items-center gap-2">
																	<Text
																		size="small"
																		className="text-ui-fg-subtle"
																	>
																		Lager:{' '}
																		{(() => {
																			const inventoryItem =
																				getItemInventoryStatus(item.id);
																			if (
																				inventoryItem &&
																				inventoryItem.stock_status !== 'service'
																			) {
																				return inventoryItem.available_quantity;
																			}
																			return (
																				item.inventory_quantity ?? 'Unbekannt'
																			);
																		})()}
																	</Text>
																	{(() => {
																		const inventoryItem =
																			getItemInventoryStatus(item.id);
																		if (inventoryItem) {
																			switch (inventoryItem.stock_status) {
																				case 'out_of_stock':
																					return (
																						<Badge color="red" size="small">
																							Nicht verfügbar
																						</Badge>
																					);
																				case 'low_stock':
																					return (
																						<Badge color="orange" size="small">
																							Niedrig
																						</Badge>
																					);
																				case 'available':
																					return (
																						<Badge color="green" size="small">
																							Verfügbar
																						</Badge>
																					);
																				case 'service':
																					return (
																						<Badge color="blue" size="small">
																							Service
																						</Badge>
																					);
																			}
																		}
																		if (item.inventory_quantity !== undefined) {
																			if (item.inventory_quantity <= 0) {
																				return (
																					<Badge color="red" size="small">
																						Nicht verfügbar
																					</Badge>
																				);
																			}
																			if (item.inventory_quantity <= 5) {
																				return (
																					<Badge color="orange" size="small">
																						Niedrig
																					</Badge>
																				);
																			}
																		}
																		return null;
																	})()}
																</div>
															)}
														{item.variant_title && (
															<Text size="small" className="text-ui-fg-subtle">
																Variante:
																{item.variant_id && item.product_id ? (
																	<a
																		href={`/app/products/${item.product_id}/variants/${item.variant_id}`}
																		className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover ml-1 truncate max-w-[360px] inline-block"
																		target="_blank"
																		rel="noopener noreferrer"
																		title={item.variant_title}
																	>
																		{item.variant_title}
																	</a>
																) : (
																	<span
																		className="ml-1 truncate max-w-[100px] inline-block"
																		title={item.variant_title}
																	>
																		{item.variant_title}
																	</span>
																)}
															</Text>
														)}
													</div>
													<div className="flex items-center gap-4 flex-shrink-0 min-w-[150px]">
														<Text
															size="base"
															weight="plus"
															className="whitespace-nowrap"
														>
															{(calculateItemTotal(item) / 100).toFixed(2)} €
														</Text>
													</div>
												</div>
											</>
										)}
									</div>
								))}
							</div>
						)}
					</div>

					{/* Totals */}
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
							<div className="flex justify-between">
								<Text size="small" className="text-ui-fg-subtle">
									MwSt. (19%):
								</Text>
								<Text size="small" weight="plus">
									{totals.tax ? (totals.tax / 100).toFixed(2) : '0.00'} €
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
				</div>

				{/* Sidebar */}
				<div className="space-y-6 lg:col-span-4">
					{/* Customer Information */}
					<div className="bg-ui-bg-subtle rounded-lg p-6">
						<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
							Kundeninformationen
						</Text>

						<div className="space-y-3">
							{offer.customer_name && (
								<div>
									<Text size="small" weight="plus" className="text-ui-fg-base">
										Name:
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										{offer.customer_name}
									</Text>
								</div>
							)}

							{offer.customer_email && (
								<div>
									<Text size="small" weight="plus" className="text-ui-fg-base">
										E-Mail:
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										{offer.customer_email}
									</Text>
								</div>
							)}

							{offer.customer_phone && (
								<div>
									<Text size="small" weight="plus" className="text-ui-fg-base">
										Telefon:
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										{offer.customer_phone}
									</Text>
								</div>
							)}

							{offer.customer_address && (
								<div>
									<Text size="small" weight="plus" className="text-ui-fg-base">
										Adresse:
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										{offer.customer_address}
									</Text>
								</div>
							)}
						</div>
					</div>

					{/* Dates */}
					<div className="bg-ui-bg-subtle rounded-lg p-6">
						<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
							Wichtige Daten
						</Text>

						<div className="space-y-3">
							<div>
								<Text size="small" weight="plus" className="text-ui-fg-base">
									Erstellt:
								</Text>
								<Text size="small" className="text-ui-fg-subtle">
									{new Date(offer.created_at).toLocaleString('de-DE')}
								</Text>
							</div>

							<div>
								<Text size="small" weight="plus" className="text-ui-fg-base">
									Aktualisiert:
								</Text>
								<Text size="small" className="text-ui-fg-subtle">
									{new Date(offer.updated_at).toLocaleString('de-DE')}
								</Text>
							</div>

							{offer.valid_until && (
								<div>
									<Text size="small" weight="plus" className="text-ui-fg-base">
										Gültig bis:
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										{new Date(offer.valid_until).toLocaleDateString('de-DE')}
									</Text>
								</div>
							)}
						</div>
					</div>

					{/* Inventory Status */}
					{inventoryStatus &&
						offer.items.some(item => item.item_type === 'product') && (
							<div className="bg-ui-bg-subtle rounded-lg p-6">
								<Text
									size="large"
									weight="plus"
									className="text-ui-fg-base mb-4"
								>
									Lagerstatus
								</Text>

								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<Text size="small" className="text-ui-fg-subtle">
											Gesamtstatus:
										</Text>
										<Badge
											color={inventoryStatus.can_complete ? 'green' : 'red'}
											size="small"
										>
											{inventoryStatus.can_complete
												? '✅ Verfügbar'
												: '❌ Nicht verfügbar'}
										</Badge>
									</div>

									{inventoryStatus.has_out_of_stock && (
										<div className="p-2 bg-red-50 border border-red-200 rounded-md">
											<Text size="small" className="text-red-700">
												⚠️ Einige Artikel sind nicht auf Lager
											</Text>
										</div>
									)}

									{inventoryStatus.has_low_stock && (
										<div className="p-2 bg-orange-50 border border-orange-200 rounded-md">
											<Text size="small" className="text-orange-700">
												⚠️ Einige Artikel haben niedrigen Lagerbestand
											</Text>
										</div>
									)}

									<div className="text-xs text-ui-fg-muted">
										Letzter Check: {new Date().toLocaleTimeString('de-DE')}
									</div>
								</div>
							</div>
						)}

					{/* Actions */}
					<div className="bg-ui-bg-subtle rounded-lg p-6">
						<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
							Aktionen
						</Text>

						<div className="flex flex-col gap-2">
							{/* ✅ PDF generation only for finalized offers (not draft) */}
							{['active', 'accepted', 'cancelled', 'completed'].includes(
								offer.status,
							) && (
								<div className="flex items-center gap-2">
									<Button
										variant="secondary"
										size="small"
										onClick={generatePDF}
										disabled={generatingPDF}
									>
										<FileText className="w-4 h-4 mr-2" />
										{generatingPDF ? 'PDF wird erstellt...' : 'PDF erstellen'}
									</Button>
									{pdfUrl && (
										<div className="flex items-center gap-2">
											<a
												href={pdfUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-600 hover:text-blue-800 text-sm underline"
												title="PDF in neuem Tab öffnen"
											>
												📄 {pdfFilename}
											</a>
										</div>
									)}
								</div>
							)}

							{offer.items.some(item => item.item_type === 'product') && (
								<Button
									variant="secondary"
									size="small"
									onClick={checkInventoryAvailability}
									disabled={checkingInventory}
								>
									{checkingInventory ? <>⏳ Prüfe...</> : <>🔄 Lager prüfen</>}
								</Button>
							)}
						</div>
					</div>

					{/* Notes */}
					{(offer.internal_notes || offer.customer_notes) && (
						<div className="bg-ui-bg-subtle rounded-lg p-6">
							<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
								Notizen
							</Text>

							{offer.internal_notes && (
								<div className="mb-4">
									<Text
										size="small"
										weight="plus"
										className="text-ui-fg-base mb-2"
									>
										Intern:
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										{offer.internal_notes}
									</Text>
								</div>
							)}

							{offer.customer_notes && (
								<div>
									<Text
										size="small"
										weight="plus"
										className="text-ui-fg-base mb-2"
									>
										Kunde:
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										{offer.customer_notes}
									</Text>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</Container>
	);
}
