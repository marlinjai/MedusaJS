// busbasisberlin/src/admin/routes/lieferanten/page.tsx
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { HandTruck, MagnifyingGlass, Plus, XMark } from '@medusajs/icons';
import { Button, Container, Input, Select, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Supplier } from '../../../modules/supplier/models/supplier';
import ColumnVisibilityControl from './components/ColumnVisibilityControl';
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
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(50);

	// Column sorting state
	const [sortConfig, setSortConfig] = useState<{
		key: string;
		direction: 'asc' | 'desc';
	} | null>(null);

	// Column visibility state
	const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
		const saved = localStorage.getItem('suppliers-visible-columns');
		if (saved) {
			try {
				return new Set(JSON.parse(saved));
			} catch {}
		}
		return new Set(['company', 'contacts', 'addresses', 'numbers', 'bank_info', 'actions']);
	});

	// Persist visible columns
	useEffect(() => {
		localStorage.setItem('suppliers-visible-columns', JSON.stringify([...visibleColumns]));
	}, [visibleColumns]);

	// Fetch suppliers with details with pagination
	const { data, isLoading, isFetching } = useQuery({
		queryKey: ['admin-suppliers-with-details', searchTerm, currentPage, pageSize, sortConfig],
		queryFn: async () => {
			const params = new URLSearchParams();
			params.append('withDetails', 'true');
			if (searchTerm) params.append('search', searchTerm);
			params.append('limit', pageSize.toString());
			params.append('offset', ((currentPage - 1) * pageSize).toString());
			if (sortConfig) {
				params.append('sort_by', sortConfig.key);
				params.append('sort_direction', sortConfig.direction);
			}

			const res = await fetch(`/admin/suppliers?${params.toString()}`, {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch suppliers');
			return res.json() as Promise<SuppliersResponse>;
		},
		staleTime: 30000,
		placeholderData: previousData => previousData,
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

	const totalPages = Math.ceil((data?.stats?.total || 0) / pageSize);

	// Handlers
	const handleSort = (key: string, direction: 'asc' | 'desc') => {
		if (key === '') {
			setSortConfig(null);
		} else {
			setSortConfig({ key, direction });
		}
		setCurrentPage(1);
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handlePreviousPage = () => {
		if (currentPage > 1) setCurrentPage(currentPage - 1);
	};

	const handleNextPage = () => {
		if (currentPage < totalPages) setCurrentPage(currentPage + 1);
	};

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

			{/* Results Info and Controls */}
			<div className="mt-2 flex justify-between items-center">
				<div className="flex items-center gap-3">
					{/* Column Visibility Control */}
					<ColumnVisibilityControl
						columns={[
							{ key: 'company', label: 'Firma', width: 250 },
							{ key: 'contacts', label: 'Kontaktinformation', width: 220 },
							{ key: 'addresses', label: 'Adresse', width: 200 },
							{ key: 'numbers', label: 'Nummern', width: 150 },
							{ key: 'bank_info', label: 'Bankdaten', width: 180 },
							{ key: 'actions', label: 'Aktionen', width: 80 },
						]}
						visibleColumns={visibleColumns}
						onToggle={(key) => {
							const newVisible = new Set(visibleColumns);
							if (newVisible.has(key)) {
								newVisible.delete(key);
							} else {
								newVisible.add(key);
							}
							setVisibleColumns(newVisible);
						}}
						onShowAll={() => {
							setVisibleColumns(new Set(['company', 'contacts', 'addresses', 'numbers', 'bank_info', 'actions']));
						}}
						onHideAll={() => {
							setVisibleColumns(new Set(['company', 'actions']));
						}}
					/>

					{/* Result Amount Selector */}
					<Select value={pageSize.toString()} onValueChange={(value) => {
						setPageSize(parseInt(value));
						setCurrentPage(1);
					}}>
						<Select.Trigger className="w-32">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="25">25 pro Seite</Select.Item>
							<Select.Item value="50">50 pro Seite</Select.Item>
							<Select.Item value="100">100 pro Seite</Select.Item>
							<Select.Item value="200">200 pro Seite</Select.Item>
						</Select.Content>
					</Select>

					<span className="text-sm text-ui-fg-muted">
						{isFetching
							? 'Wird geladen...'
							: `${suppliers.length} Lieferanten auf Seite ${currentPage} von ${totalPages}`}
						{searchTerm && ` • Suche: "${searchTerm}"`}
						{data?.stats?.total && ` • Gesamt: ${data.stats.total} Lieferanten`}
					</span>
				</div>

				{/* Pagination Controls */}
				{totalPages > 1 && (
					<div className="flex items-center gap-2">
						<Button
							variant="secondary"
							size="small"
							onClick={handlePreviousPage}
							disabled={currentPage === 1 || isFetching}
						>
							Zurück
						</Button>
						<span className="text-sm text-ui-fg-muted">
							Seite {currentPage} von {totalPages}
						</span>
						<Button
							variant="secondary"
							size="small"
							onClick={handleNextPage}
							disabled={currentPage >= totalPages || isFetching}
						>
							Weiter
						</Button>
					</div>
				)}
			</div>
		</div>

		{/* Table */}
		<div className="flex-1 overflow-hidden">
			<div className="h-full overflow-auto px-6 py-4">
				<SupplierTable
					suppliers={suppliers}
					onEdit={handleEdit}
					onDelete={handleDelete}
					isLoading={isLoading}
					isFetching={isFetching}
					onSort={handleSort}
					sortConfig={sortConfig}
					visibleColumns={visibleColumns}
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
