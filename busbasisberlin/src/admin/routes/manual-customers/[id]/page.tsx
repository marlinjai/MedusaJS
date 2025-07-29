// busbasisberlin/src/admin/routes/manual-customers/[id]/page.tsx
// Manual Customer Detail page with customer linking functionality
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
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, ExternalLink, Save, Unlink, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface ManualCustomer {
	id: string;
	customer_number: string;
	internal_key: string;
	salutation: string;
	title: string;
	first_name: string;
	last_name: string;
	company: string;
	company_addition: string;
	email: string;
	phone: string;
	fax: string;
	mobile: string;
	website: string;
	street: string;
	address_addition: string;
	street_number: string;
	postal_code: string;
	city: string;
	country: string;
	state: string;
	vat_id: string;
	tax_number: string;
	customer_type: string;
	customer_group: string;
	status: string;
	source: string;
	import_reference: string;
	// Customer linking fields
	core_customer_id: string;
	is_linked: boolean;
	linked_at: string;
	linking_method: string;
	notes: string;
	additional_info: string;
	birthday: string;
	ebay_name: string;
	language: string;
	preferred_contact_method: string;
	total_purchases: number;
	total_spent: number;
	last_purchase_date: string;
	legacy_customer_id: string;
	legacy_system_reference: string;
	first_contact_date: string;
	last_contact_date: string;
	created_at: string;
	updated_at: string;
}

export default function ManualCustomerDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [customer, setCustomer] = useState<ManualCustomer | null>(null);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);

	// Customer linking states
	const [, setShowLinkingDropdown] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [coreCustomers, setCoreCustomers] = useState<any[]>([]);
	const [searchingCustomers, setSearchingCustomers] = useState(false);
	const [linking, setLinking] = useState(false);
	const [, setSelectedCustomer] = useState<any>(null);
	const [linkedCoreCustomer, setLinkedCoreCustomer] = useState<any>(null);

	// Load customer data
	useEffect(() => {
		if (id) {
			loadCustomer();
		}
	}, [id]);

	const loadCustomer = async () => {
		try {
			const response = await fetch(`/admin/manual-customers/${id}`);
			if (!response.ok) {
				throw new Error('Failed to load customer');
			}
			const data = await response.json();
			setCustomer(data.customer);

			// If customer is linked, fetch core customer details
			if (data.customer.is_linked && data.customer.core_customer_id) {
				await loadLinkedCoreCustomer(data.customer.core_customer_id);
			}
		} catch (error) {
			console.error('Error loading customer:', error);
			toast.error('Fehler beim Laden des Kunden');
		} finally {
			setLoading(false);
		}
	};

	// Load linked core customer details
	const loadLinkedCoreCustomer = async (coreCustomerId: string) => {
		try {
			const response = await fetch(`/admin/customers/${coreCustomerId}`);
			if (response.ok) {
				const data = await response.json();
				setLinkedCoreCustomer(data.customer);
			}
		} catch (error) {
			console.error('Error loading core customer:', error);
			// Don't show error toast for this, it's not critical
		}
	};

	// Save customer changes
	const saveCustomer = async () => {
		if (!customer) return;

		setSaving(true);
		try {
			// Prepare payload (convert empty strings to null, handle numbers/dates)
			const payload: Record<string, any> = { ...customer };
			// Convert empty strings to null
			Object.keys(payload).forEach(k => {
				if (payload[k] === '') payload[k] = null;
			});
			// Convert numbers
			payload.total_purchases = Number(payload.total_purchases) || 0;
			payload.total_spent = Number(payload.total_spent) || 0;
			// Convert dates (if present)
			[
				'birthday',
				'last_purchase_date',
				'first_contact_date',
				'last_contact_date',
			].forEach(k => {
				if (payload[k]) payload[k] = new Date(payload[k]);
			});

			const response = await fetch(`/admin/manual-customers/${customer.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Fehler beim Speichern des Kunden');
			}

			const result = await response.json();
			setCustomer(result.customer);
			setEditing(false);
			toast.success('Kunde erfolgreich gespeichert');

			// Invalidate cache to ensure fresh data on the overview page
			queryClient.invalidateQueries({ queryKey: ['admin-manual-customers'] });
		} catch (error) {
			console.error('Error saving customer:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Fehler beim Speichern des Kunden',
			);
		} finally {
			setSaving(false);
		}
	};

	// Cancel editing
	const cancelEditing = () => {
		setEditing(false);
		loadCustomer(); // Reload original data
	};

	// Handle field changes
	const handleChange = (field: string, value: string | number) => {
		setCustomer(prev => (prev ? { ...prev, [field]: value } : prev));
	};

	// Get status color
	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active':
				return 'green' as const;
			case 'inactive':
				return 'grey' as const;
			case 'blocked':
				return 'red' as const;
			case 'pending':
				return 'orange' as const;
			default:
				return 'grey' as const;
		}
	};

	// Get customer type display text
	const getCustomerTypeText = (type: string): string => {
		switch (type) {
			case 'walk-in':
				return 'Laufkundschaft';
			case 'legacy':
				return 'Legacy';
			case 'business':
				return 'Geschäftskunde';
			case 'private':
				return 'Privatkunde';
			case 'online':
				return 'Online-Kunde';
			default:
				return type;
		}
	};

	// Get status display text
	const getStatusText = (status: string): string => {
		switch (status) {
			case 'active':
				return 'Aktiv';
			case 'inactive':
				return 'Inaktiv';
			case 'blocked':
				return 'Blockiert';
			case 'pending':
				return 'Wartend';
			default:
				return status;
		}
	};

	// Search for core customers with debouncing
	const searchCoreCustomers = async (query: string) => {
		if (!query.trim() || query.length < 2) {
			setCoreCustomers([]);
			return;
		}

		setSearchingCustomers(true);
		try {
			// Search in Medusa's core customer API
			const res = await fetch(
				`/admin/customers?q=${encodeURIComponent(query)}&limit=10`,
				{
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);

			if (!res.ok) {
				throw new Error('Fehler beim Suchen der Kunden');
			}

			const data = await res.json();
			setCoreCustomers(data.customers || []);
		} catch (error) {
			console.error('Error searching core customers:', error);
			toast.error('Fehler beim Suchen der Kunden');
			setCoreCustomers([]);
		} finally {
			setSearchingCustomers(false);
		}
	};

	// Debounced search effect
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			searchCoreCustomers(searchQuery);
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [searchQuery]);

	// Link customer manually
	const linkCustomer = async (coreCustomerId: string) => {
		if (!customer?.id) return;

		setLinking(true);
		try {
			const res = await fetch(`/admin/manual-customers/${customer.id}/link`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					core_customer_id: coreCustomerId,
					linking_method: 'manual-link',
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Fehler beim Verknüpfen des Kunden');
			}

			toast.success('Kunde erfolgreich verknüpft');
			setShowLinkingDropdown(false);
			setSearchQuery('');
			setCoreCustomers([]);
			setSelectedCustomer(null);
			await loadCustomer(); // Reload customer data

			// Invalidate cache to ensure fresh data on the overview page
			queryClient.invalidateQueries({ queryKey: ['admin-manual-customers'] });
		} catch (error) {
			console.error('Error linking customer:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Fehler beim Verknüpfen des Kunden',
			);
		} finally {
			setLinking(false);
		}
	};

	// Unlink customer
	const unlinkCustomer = async () => {
		if (!customer?.id) return;

		setLinking(true);
		try {
			const res = await fetch(`/admin/manual-customers/${customer.id}/link`, {
				method: 'DELETE',
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(
					data.message || 'Fehler beim Entfernen der Verknüpfung',
				);
			}

			toast.success('Verknüpfung erfolgreich entfernt');
			await loadCustomer(); // Reload customer data

			// Invalidate cache to ensure fresh data on the overview page
			queryClient.invalidateQueries({ queryKey: ['admin-manual-customers'] });
		} catch (error) {
			console.error('Error unlinking customer:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Fehler beim Entfernen der Verknüpfung',
			);
		} finally {
			setLinking(false);
		}
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

	if (!customer) {
		return (
			<Container>
				<div className="flex items-center justify-center h-64">
					<Text size="small" className="text-ui-fg-muted">
						Kunde nicht gefunden
					</Text>
				</div>
			</Container>
		);
	}

	return (
		<Container>
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Button
						variant="secondary"
						size="small"
						onClick={() => navigate('/manual-customers')}
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Zurück
					</Button>
					<div>
						<div className="flex items-center gap-3">
							<Text size="xlarge" weight="plus" className="text-ui-fg-base">
								{customer.customer_number || 'Kein Nummer'}
							</Text>
							<Badge color={getStatusColor(customer.status)}>
								{getStatusText(customer.status)}
							</Badge>
							<Badge color="blue">
								{getCustomerTypeText(customer.customer_type)}
							</Badge>
						</div>
						<Text size="small" className="text-ui-fg-subtle">
							{customer.company ||
								`${customer.first_name} ${customer.last_name}`.trim() ||
								'Unbenannter Kunde'}
						</Text>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{editing ? (
						<>
							<Button variant="secondary" size="small" onClick={cancelEditing}>
								<X className="w-4 h-4 mr-2" />
								Abbrechen
							</Button>
							<Button size="small" onClick={saveCustomer} disabled={saving}>
								<Save className="w-4 h-4 mr-2" />
								{saving ? 'Wird gespeichert...' : 'Speichern'}
							</Button>
						</>
					) : (
						<Button
							variant="secondary"
							size="small"
							onClick={() => setEditing(true)}
						>
							<Edit className="w-4 h-4 mr-2" />
							Bearbeiten
						</Button>
					)}
				</div>
			</div>

			<div className="space-y-6">
				{/* Identification */}
				<Section title="Identifikation">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Kundennummer
						</Text>
						{editing ? (
							<Input
								value={customer.customer_number || ''}
								onChange={e => handleChange('customer_number', e.target.value)}
								placeholder="Automatisch generiert"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.customer_number || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Interner Schlüssel
						</Text>
						{editing ? (
							<Input
								value={customer.internal_key || ''}
								onChange={e => handleChange('internal_key', e.target.value)}
								placeholder="Interner Schlüssel"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.internal_key || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
				</Section>

				{/* Personal Info */}
				<Section title="Persönliche Informationen">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Anrede
						</Text>
						{editing ? (
							<Input
								value={customer.salutation || ''}
								onChange={e => handleChange('salutation', e.target.value)}
								placeholder="Herr/Frau"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.salutation || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Titel
						</Text>
						{editing ? (
							<Input
								value={customer.title || ''}
								onChange={e => handleChange('title', e.target.value)}
								placeholder="Dr., Prof., etc."
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.title || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Vorname
						</Text>
						{editing ? (
							<Input
								value={customer.first_name || ''}
								onChange={e => handleChange('first_name', e.target.value)}
								placeholder="Vorname"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.first_name || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Nachname
						</Text>
						{editing ? (
							<Input
								value={customer.last_name || ''}
								onChange={e => handleChange('last_name', e.target.value)}
								placeholder="Nachname"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.last_name || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Firma
						</Text>
						{editing ? (
							<Input
								value={customer.company || ''}
								onChange={e => handleChange('company', e.target.value)}
								placeholder="Firmenname"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.company || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Firmenzusatz
						</Text>
						{editing ? (
							<Input
								value={customer.company_addition || ''}
								onChange={e => handleChange('company_addition', e.target.value)}
								placeholder="GmbH, AG, etc."
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.company_addition || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
				</Section>

				{/* Contact Info */}
				<Section title="Kontaktinformationen">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							E-Mail
						</Text>
						{editing ? (
							<Input
								value={customer.email || ''}
								onChange={e => handleChange('email', e.target.value)}
								type="email"
								placeholder="kunde@beispiel.de"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.email || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Telefon
						</Text>
						{editing ? (
							<Input
								value={customer.phone || ''}
								onChange={e => handleChange('phone', e.target.value)}
								placeholder="+49 30 12345678"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.phone || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Fax
						</Text>
						{editing ? (
							<Input
								value={customer.fax || ''}
								onChange={e => handleChange('fax', e.target.value)}
								placeholder="+49 30 12345679"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.fax || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Mobil
						</Text>
						{editing ? (
							<Input
								value={customer.mobile || ''}
								onChange={e => handleChange('mobile', e.target.value)}
								placeholder="+49 170 1234567"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.mobile || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Webseite
						</Text>
						{editing ? (
							<Input
								value={customer.website || ''}
								onChange={e => handleChange('website', e.target.value)}
								placeholder="https://beispiel.de"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.website || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
				</Section>

				{/* Address Info */}
				<Section title="Adresse">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Straße
						</Text>
						{editing ? (
							<Input
								value={customer.street || ''}
								onChange={e => handleChange('street', e.target.value)}
								placeholder="Musterstraße"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.street || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Adresszusatz
						</Text>
						{editing ? (
							<Input
								value={customer.address_addition || ''}
								onChange={e => handleChange('address_addition', e.target.value)}
								placeholder="Hinterhof, c/o, etc."
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.address_addition || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Hausnummer
						</Text>
						{editing ? (
							<Input
								value={customer.street_number || ''}
								onChange={e => handleChange('street_number', e.target.value)}
								placeholder="123a"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.street_number || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							PLZ
						</Text>
						{editing ? (
							<Input
								value={customer.postal_code || ''}
								onChange={e => handleChange('postal_code', e.target.value)}
								placeholder="12345"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.postal_code || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Stadt
						</Text>
						{editing ? (
							<Input
								value={customer.city || ''}
								onChange={e => handleChange('city', e.target.value)}
								placeholder="Berlin"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.city || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Land
						</Text>
						{editing ? (
							<Input
								value={customer.country || ''}
								onChange={e => handleChange('country', e.target.value)}
								placeholder="Deutschland"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.country || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Bundesland
						</Text>
						{editing ? (
							<Input
								value={customer.state || ''}
								onChange={e => handleChange('state', e.target.value)}
								placeholder="Berlin"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.state || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
				</Section>

				{/* Business Info */}
				<Section title="Geschäftliche Informationen">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							USt-IdNr.
						</Text>
						{editing ? (
							<Input
								value={customer.vat_id || ''}
								onChange={e => handleChange('vat_id', e.target.value)}
								placeholder="DE123456789"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.vat_id || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Steuernummer
						</Text>
						{editing ? (
							<Input
								value={customer.tax_number || ''}
								onChange={e => handleChange('tax_number', e.target.value)}
								placeholder="123/456/78901"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.tax_number || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Kundengruppe
						</Text>
						{editing ? (
							<Input
								value={customer.customer_group || ''}
								onChange={e => handleChange('customer_group', e.target.value)}
								placeholder="Privat, Geschäft, VIP"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.customer_group || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
				</Section>

				{/* Status & Type */}
				<Section title="Typ & Status">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Kundentyp
						</Text>
						{editing ? (
							<Select
								value={customer.customer_type}
								onValueChange={v => handleChange('customer_type', v)}
							>
								<Select.Trigger className="w-full">
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="walk-in">Laufkundschaft</Select.Item>
									<Select.Item value="legacy">Legacy</Select.Item>
									<Select.Item value="business">Geschäftskunde</Select.Item>
									<Select.Item value="private">Privatkunde</Select.Item>
									<Select.Item value="online">Online-Kunde</Select.Item>
								</Select.Content>
							</Select>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{getCustomerTypeText(customer.customer_type)}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Status
						</Text>
						{editing ? (
							<Select
								value={customer.status}
								onValueChange={v => handleChange('status', v)}
							>
								<Select.Trigger className="w-full">
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="active">Aktiv</Select.Item>
									<Select.Item value="inactive">Inaktiv</Select.Item>
									<Select.Item value="blocked">Blockiert</Select.Item>
									<Select.Item value="pending">Wartend</Select.Item>
								</Select.Content>
							</Select>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{getStatusText(customer.status)}
							</Text>
						)}
					</div>
				</Section>

				{/* Source & Import */}
				<Section title="Quelle & Import">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Quelle
						</Text>
						{editing ? (
							<Input
								value={customer.source || ''}
								onChange={e => handleChange('source', e.target.value)}
								placeholder="manual-entry, csv-import, etc."
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.source || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Import-Referenz
						</Text>
						{editing ? (
							<Input
								value={customer.import_reference || ''}
								onChange={e => handleChange('import_reference', e.target.value)}
								placeholder="Batch-ID oder Dateiname"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.import_reference || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
				</Section>

				{/* Additional Info */}
				<Section title="Weitere Informationen">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Notizen
						</Text>
						{editing ? (
							<Textarea
								value={customer.notes || ''}
								onChange={e => handleChange('notes', e.target.value)}
								rows={3}
								placeholder="Interne Notizen zum Kunden"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.notes || 'Keine Notizen'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Zusätzliche Infos (JSON)
						</Text>
						{editing ? (
							<Textarea
								value={customer.additional_info || ''}
								onChange={e => handleChange('additional_info', e.target.value)}
								rows={3}
								placeholder="JSON-Daten für erweiterte Informationen"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.additional_info || 'Keine zusätzlichen Infos'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Geburtstag
						</Text>
						{editing ? (
							<Input
								value={customer.birthday || ''}
								onChange={e => handleChange('birthday', e.target.value)}
								type="date"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.birthday
									? new Date(customer.birthday).toLocaleDateString('de-DE')
									: 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							eBay-Name
						</Text>
						{editing ? (
							<Input
								value={customer.ebay_name || ''}
								onChange={e => handleChange('ebay_name', e.target.value)}
								placeholder="eBay-Benutzername"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.ebay_name || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
				</Section>

				{/* Preferences */}
				<Section title="Präferenzen">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Sprache
						</Text>
						{editing ? (
							<Select
								value={customer.language}
								onValueChange={v => handleChange('language', v)}
							>
								<Select.Trigger className="w-full">
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="de">Deutsch</Select.Item>
									<Select.Item value="en">English</Select.Item>
									<Select.Item value="fr">Français</Select.Item>
									<Select.Item value="es">Español</Select.Item>
								</Select.Content>
							</Select>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.language === 'de'
									? 'Deutsch'
									: customer.language === 'en'
										? 'English'
										: customer.language === 'fr'
											? 'Français'
											: customer.language === 'es'
												? 'Español'
												: customer.language || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Bevorzugte Kontaktmethode
						</Text>
						{editing ? (
							<Select
								value={customer.preferred_contact_method}
								onValueChange={v => handleChange('preferred_contact_method', v)}
							>
								<Select.Trigger className="w-full">
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="email">E-Mail</Select.Item>
									<Select.Item value="phone">Telefon</Select.Item>
									<Select.Item value="sms">SMS</Select.Item>
									<Select.Item value="letter">Brief</Select.Item>
								</Select.Content>
							</Select>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.preferred_contact_method === 'email'
									? 'E-Mail'
									: customer.preferred_contact_method === 'phone'
										? 'Telefon'
										: customer.preferred_contact_method === 'sms'
											? 'SMS'
											: customer.preferred_contact_method === 'letter'
												? 'Brief'
												: customer.preferred_contact_method ||
													'Nicht festgelegt'}
							</Text>
						)}
					</div>
				</Section>

				{/* Purchase History */}
				<Section title="Kaufhistorie">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Anzahl Käufe
						</Text>
						{editing ? (
							<Input
								value={customer.total_purchases}
								onChange={e =>
									handleChange('total_purchases', Number(e.target.value))
								}
								type="number"
								min={0}
								placeholder="0"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.total_purchases || 0}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Gesamtausgaben (Cent)
						</Text>
						{editing ? (
							<Input
								value={customer.total_spent}
								onChange={e =>
									handleChange('total_spent', Number(e.target.value))
								}
								type="number"
								min={0}
								placeholder="0"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.total_spent || 0} Cent
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Letzter Kauf (Datum)
						</Text>
						{editing ? (
							<Input
								value={customer.last_purchase_date || ''}
								onChange={e =>
									handleChange('last_purchase_date', e.target.value)
								}
								type="date"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.last_purchase_date
									? new Date(customer.last_purchase_date).toLocaleDateString(
											'de-DE',
										)
									: 'Nicht festgelegt'}
							</Text>
						)}
					</div>
				</Section>

				{/* Legacy Fields */}
				<Section title="Legacy-Kunde">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Legacy-Kunden-ID
						</Text>
						{editing ? (
							<Input
								value={customer.legacy_customer_id || ''}
								onChange={e =>
									handleChange('legacy_customer_id', e.target.value)
								}
								placeholder="ID aus altem System"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.legacy_customer_id || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Legacy-System-Referenz
						</Text>
						{editing ? (
							<Input
								value={customer.legacy_system_reference || ''}
								onChange={e =>
									handleChange('legacy_system_reference', e.target.value)
								}
								placeholder="Referenz im alten System"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.legacy_system_reference || 'Nicht festgelegt'}
							</Text>
						)}
					</div>
				</Section>

				{/* Timestamps */}
				<Section title="Kontakt-Zeitstempel">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Erster Kontakt (Datum)
						</Text>
						{editing ? (
							<Input
								value={customer.first_contact_date || ''}
								onChange={e =>
									handleChange('first_contact_date', e.target.value)
								}
								type="date"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.first_contact_date
									? new Date(customer.first_contact_date).toLocaleDateString(
											'de-DE',
										)
									: 'Nicht festgelegt'}
							</Text>
						)}
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Letzter Kontakt (Datum)
						</Text>
						{editing ? (
							<Input
								value={customer.last_contact_date || ''}
								onChange={e =>
									handleChange('last_contact_date', e.target.value)
								}
								type="date"
							/>
						) : (
							<Text size="small" className="text-ui-fg-base">
								{customer.last_contact_date
									? new Date(customer.last_contact_date).toLocaleDateString(
											'de-DE',
										)
									: 'Nicht festgelegt'}
							</Text>
						)}
					</div>
				</Section>

				{/* Customer Linking */}
				<Section title="Kundenverknüpfung">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Verknüpfungsstatus
						</Text>
						<div className="flex items-center gap-2">
							<Badge color={customer.is_linked ? 'green' : 'grey'}>
								{customer.is_linked ? 'Verknüpft' : 'Nicht verknüpft'}
							</Badge>
							{customer.is_linked && customer.linking_method && (
								<Badge color="blue">
									{customer.linking_method === 'email-match'
										? 'E-Mail Match'
										: customer.linking_method === 'phone-match'
											? 'Telefon Match'
											: customer.linking_method === 'name-match'
												? 'Name Match'
												: customer.linking_method === 'manual-link'
													? 'Manuell verknüpft'
													: customer.linking_method}
								</Badge>
							)}
						</div>
					</div>

					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Core Kunden-ID
						</Text>
						{customer.core_customer_id ? (
							<div className="flex items-center gap-2">
								<Button
									variant="transparent"
									size="small"
									onClick={() => {
										// Navigate to core customer in Medusa admin
										window.open(
											`/app/customers/${customer.core_customer_id}`,
											'_blank',
										);
									}}
									className="p-0 h-auto text-ui-fg-interactive hover:text-ui-fg-interactive-hover underline flex items-center gap-1"
									title={`Core-Kunden öffnen${linkedCoreCustomer ? `: ${linkedCoreCustomer.first_name} ${linkedCoreCustomer.last_name}` : ''}`}
								>
									<div className="flex flex-col items-start">
										<Text size="small" className="text-ui-fg-interactive">
											{customer.core_customer_id}
										</Text>
										{linkedCoreCustomer && (
											<Text size="xsmall" className="text-ui-fg-muted">
												{linkedCoreCustomer.first_name}{' '}
												{linkedCoreCustomer.last_name}
												{linkedCoreCustomer.email &&
													` (${linkedCoreCustomer.email})`}
											</Text>
										)}
									</div>
									<ExternalLink className="w-3 h-3" />
								</Button>
								<Badge color="green" size="2xsmall">
									Verknüpft
								</Badge>
							</div>
						) : (
							<Text size="small" className="text-ui-fg-muted">
								Nicht verknüpft
							</Text>
						)}
					</div>

					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Verknüpft am
						</Text>
						<Text size="small" className="text-ui-fg-base">
							{customer.linked_at
								? new Date(customer.linked_at).toLocaleString('de-DE')
								: 'Nicht verknüpft'}
						</Text>
					</div>

					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Verknüpfungsmethode
						</Text>
						<Text size="small" className="text-ui-fg-base">
							{customer.linking_method === 'email-match'
								? 'E-Mail Übereinstimmung'
								: customer.linking_method === 'phone-match'
									? 'Telefon Übereinstimmung'
									: customer.linking_method === 'name-match'
										? 'Name Übereinstimmung'
										: customer.linking_method === 'manual-link'
											? 'Manuell verknüpft'
											: customer.linking_method || 'Nicht festgelegt'}
						</Text>
					</div>

					{/* Customer Linking Search */}
					{!customer.is_linked && (
						<div className="col-span-2">
							<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
								Mit Core-Kunden verknüpfen
							</Text>
							<div className="relative">
								<Input
									placeholder="Kunde suchen (Name, E-Mail, Telefon)..."
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									disabled={linking}
									className="w-full"
								/>

								{/* Search Results Dropdown */}
								{searchQuery.length >= 2 && (
									<div className="absolute top-full left-0 right-0 mt-1 bg-ui-bg-base border border-ui-border-base rounded-md shadow-elevation-flyout z-50 max-h-60 overflow-y-auto">
										{searchingCustomers && (
											<div className="flex items-center gap-3 px-3 py-2 text-ui-fg-subtle">
												<div className="animate-spin rounded-full h-4 w-4 border-2 border-ui-border-base border-t-ui-fg-base"></div>
												<Text size="small" className="text-ui-fg-subtle">
													Suche läuft...
												</Text>
											</div>
										)}

										{!searchingCustomers && coreCustomers.length === 0 && (
											<div className="px-3 py-2">
												<Text size="small" className="text-ui-fg-muted">
													Keine Kunden gefunden
												</Text>
											</div>
										)}

										{!searchingCustomers &&
											coreCustomers.map(coreCustomer => (
												<div
													key={coreCustomer.id}
													className="px-3 py-2 hover:bg-ui-bg-subtle cursor-pointer transition-colors duration-150 border-b border-ui-border-base last:border-b-0 first:rounded-t-md last:rounded-b-md"
													onClick={() => {
														setSelectedCustomer(coreCustomer);
														linkCustomer(coreCustomer.id);
														setSearchQuery('');
														setCoreCustomers([]);
													}}
												>
													<div className="flex items-start justify-between">
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2 mb-1">
																<Text
																	size="small"
																	weight="plus"
																	className="text-ui-fg-base truncate"
																>
																	{coreCustomer.first_name}{' '}
																	{coreCustomer.last_name}
																</Text>
																{coreCustomer.has_account && (
																	<Badge color="green" size="2xsmall">
																		Registriert
																	</Badge>
																)}
															</div>
															<Text
																size="xsmall"
																className="text-ui-fg-subtle truncate"
															>
																{coreCustomer.email}
															</Text>
															{coreCustomer.phone && (
																<Text
																	size="xsmall"
																	className="text-ui-fg-muted truncate"
																>
																	{coreCustomer.phone}
																</Text>
															)}
														</div>
														<div className="flex-shrink-0 ml-2">
															<Badge color="blue" size="2xsmall">
																{coreCustomer.id.slice(-8)}
															</Badge>
														</div>
													</div>
												</div>
											))}
									</div>
								)}
							</div>
							<Text size="small" className="text-ui-fg-subtle mt-1">
								Geben Sie mindestens 2 Zeichen ein, um nach Kunden zu suchen
							</Text>
						</div>
					)}

					{/* Unlink Button */}
					{customer.is_linked && (
						<div className="col-span-2">
							<Button
								variant="secondary"
								size="small"
								onClick={unlinkCustomer}
								disabled={linking}
								className="mt-2"
							>
								<Unlink className="w-4 h-4 mr-2" />
								{linking ? 'Entferne Verknüpfung...' : 'Verknüpfung entfernen'}
							</Button>
						</div>
					)}
				</Section>

				{/* System Info */}
				<Section title="System-Informationen">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Erstellt am
						</Text>
						<Text size="small" className="text-ui-fg-base">
							{new Date(customer.created_at).toLocaleString('de-DE')}
						</Text>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Zuletzt aktualisiert
						</Text>
						<Text size="small" className="text-ui-fg-base">
							{new Date(customer.updated_at).toLocaleString('de-DE')}
						</Text>
					</div>
				</Section>
			</div>
		</Container>
	);
}

// Helper section component for grouping fields
function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="bg-ui-bg-subtle rounded-lg p-6 mb-2">
			<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
				{title}
			</Text>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
		</div>
	);
}
