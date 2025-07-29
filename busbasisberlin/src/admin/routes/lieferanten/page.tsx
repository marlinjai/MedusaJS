// busbasisberlin/src/admin/routes/lieferanten/page.tsx
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { HandTruck, MagnifyingGlass, Plus, XMark } from '@medusajs/icons';
import { Button, Container, Input, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Supplier } from '../../../modules/supplier/models/supplier';
import SupplierTable from './components/SupplierTable';

// Type for supplier with details
type SupplierWithDetails = Supplier & {
	contacts: Array<{
		id: string;
		salutation?: string;
		first_name?: string;
		last_name?: string;
		department?: string;
		phones: Array<{ number: string; label?: string }>;
		emails: Array<{ email: string; label?: string }>;
	}>;
	addresses: Array<{
		id: string;
		label?: string;
		street?: string;
		postal_code?: string;
		city?: string;
		country_name?: string;
	}>;
};

// Type for API response
type SuppliersResponse = {
	suppliers: SupplierWithDetails[];
	stats: {
		total: number;
		active: number;
		inactive: number;
		withContacts: number;
		withAddresses: number;
		withVatId: number;
		withBankInfo: number;
	};
};

const SuppliersPage = () => {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [searchTerm, setSearchTerm] = useState('');

	// Fetch suppliers with details in a single optimized request
	const { data, isLoading } = useQuery({
		queryKey: ['admin-suppliers-with-details'],
		queryFn: async () => {
			const res = await fetch('/admin/suppliers?withDetails=true', {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch suppliers');
			return res.json() as Promise<SuppliersResponse>;
		},
	});

	const suppliers = data?.suppliers || [];
	const stats = data?.stats || {
		total: 0,
		active: 0,
		inactive: 0,
		withContacts: 0,
		withAddresses: 0,
		withVatId: 0,
		withBankInfo: 0,
	};

	// Filter suppliers based on search term
	const filteredSuppliers = useMemo(() => {
		if (!searchTerm.trim()) return suppliers;

		const searchLower = searchTerm.toLowerCase().trim();

		return suppliers.filter(supplier => {
			// Search in basic supplier fields
			const basicMatch =
				supplier.company?.toLowerCase().includes(searchLower) ||
				supplier.company_addition?.toLowerCase().includes(searchLower) ||
				supplier.supplier_number?.toLowerCase().includes(searchLower) ||
				supplier.customer_number?.toLowerCase().includes(searchLower) ||
				supplier.internal_key?.toLowerCase().includes(searchLower) ||
				supplier.vat_id?.toLowerCase().includes(searchLower) ||
				supplier.website?.toLowerCase().includes(searchLower) ||
				supplier.bank_name?.toLowerCase().includes(searchLower) ||
				supplier.iban?.toLowerCase().includes(searchLower) ||
				supplier.note?.toLowerCase().includes(searchLower);

			if (basicMatch) return true;

			// Search in contacts
			if (supplier.contacts) {
				const contactMatch = supplier.contacts.some(
					(contact: SupplierWithDetails['contacts'][0]) =>
						contact.first_name?.toLowerCase().includes(searchLower) ||
						contact.last_name?.toLowerCase().includes(searchLower) ||
						contact.department?.toLowerCase().includes(searchLower) ||
						contact.emails?.some((email: { email: string; label?: string }) =>
							email.email?.toLowerCase().includes(searchLower),
						) ||
						contact.phones?.some((phone: { number: string; label?: string }) =>
							phone.number?.includes(searchTerm),
						),
				);
				if (contactMatch) return true;
			}

			// Search in addresses
			if (supplier.addresses) {
				const addressMatch = supplier.addresses.some(
					(address: SupplierWithDetails['addresses'][0]) =>
						address.street?.toLowerCase().includes(searchLower) ||
						address.city?.toLowerCase().includes(searchLower) ||
						address.postal_code?.includes(searchTerm) ||
						address.country_name?.toLowerCase().includes(searchLower),
				);
				if (addressMatch) return true;
			}

			return false;
		});
	}, [suppliers, searchTerm]);

	// Delete supplier
	const deleteSupplier = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/admin/suppliers/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Fehler beim Löschen');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['admin-suppliers-with-details'],
			});
			toast.success('Lieferant erfolgreich gelöscht');
		},
		onError: (e: any) => toast.error(e.message),
	});

	// Handlers
	const handleCreate = () => navigate('/lieferanten/new');
	const handleEdit = (supplier: Supplier) =>
		navigate(`/lieferanten/${supplier.id}`);
	const handleDelete = (id: string) => {
		deleteSupplier.mutate(id);
	};

	const handleClearSearch = () => {
		setSearchTerm('');
	};

	return (
		<Container className="divide-y p-0 h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
				<div className="flex items-center gap-x-2">
					<HandTruck className="text-ui-fg-subtle" />
					<h1>Lieferanten</h1>
				</div>
				<Button size="small" variant="secondary" onClick={handleCreate}>
					<Plus />
					Neuer Lieferant
				</Button>
			</div>

			{/* Statistics Cards */}
			<div className="px-6 py-4 border-b">
				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									Lieferanten gesamt
								</div>
								<div className="text-lg font-semibold">{stats.total}</div>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									Aktive
								</div>
								<div className="text-lg font-semibold">{stats.active}</div>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									Mit Kontakten
								</div>
								<div className="text-lg font-semibold">
									{stats.withContacts}
								</div>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									Mit Adressen
								</div>
								<div className="text-lg font-semibold">
									{stats.withAddresses}
								</div>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									Mit USt-ID
								</div>
								<div className="text-lg font-semibold">{stats.withVatId}</div>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									Mit Bankdaten
								</div>
								<div className="text-lg font-semibold">
									{stats.withBankInfo}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Search Bar */}
			<div className="px-6 py-4 border-b bg-ui-bg-subtle">
				<div className="flex items-center gap-x-2">
					<div className="relative flex-1">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<MagnifyingGlass className="h-4 w-4 text-ui-fg-muted" />
						</div>
						<Input
							placeholder="Suchen nach Firma, Lieferantennummer, Kontakt, E-Mail, Adresse..."
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
							className="pl-10 pr-10"
						/>
						{searchTerm && (
							<button
								onClick={handleClearSearch}
								className="absolute inset-y-0 right-0 pr-3 flex items-center"
							>
								<XMark className="h-4 w-4 text-ui-fg-muted hover:text-ui-fg-base" />
							</button>
						)}
					</div>
				</div>

				{/* Search Results Info */}
				{searchTerm && (
					<div className="mt-2 text-sm text-ui-fg-subtle">
						{filteredSuppliers.length === 0 ? (
							<span>Keine Ergebnisse für "{searchTerm}"</span>
						) : filteredSuppliers.length === 1 ? (
							<span>1 Ergebnis für "{searchTerm}"</span>
						) : (
							<span>
								{filteredSuppliers.length} Ergebnisse für "{searchTerm}"
							</span>
						)}
						{filteredSuppliers.length !== suppliers.length && (
							<span className="ml-2 text-ui-fg-muted">
								(von {suppliers.length} gesamt)
							</span>
						)}
					</div>
				)}
			</div>

			{/* Table */}
			<div className="flex-1 overflow-hidden">
				<div className="h-full overflow-auto px-6 py-4">
					<SupplierTable
						suppliers={filteredSuppliers}
						onEdit={handleEdit}
						onDelete={handleDelete}
						isLoading={isLoading}
					/>
				</div>
			</div>
		</Container>
	);
};

// Route configuration
export const config = defineRouteConfig({
	label: 'Lieferanten',
	icon: HandTruck,
});

export default SuppliersPage;
