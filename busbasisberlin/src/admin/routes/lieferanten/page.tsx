// busbasisberlin/src/admin/routes/lieferanten/page.tsx
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { HandTruck, MagnifyingGlass, Plus, XMark } from '@medusajs/icons';
import { Button, Container, Input, Select, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Supplier } from '../../../modules/supplier/models/supplier';
import ColumnVisibilityControl from './components/ColumnVisibilityControl';
import SupplierTable from './components/SupplierTable';
import { MobileControlBar } from '../../components/MobileControlBar';
import { BottomSheet } from '../../components/BottomSheet';
import { useIsMobile } from '../../utils/use-mobile';

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

	// Mobile state
	const isMobile = useIsMobile();
	const [showFilterSheet, setShowFilterSheet] = useState(false);
	const [showSortSheet, setShowSortSheet] = useState(false);
	const [showColumnSheet, setShowColumnSheet] = useState(false);

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
		<Container className="p-0 md:p-6 h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-2 py-1.5 md:px-6 md:py-4 flex-shrink-0">
				<div className="flex items-center gap-x-2">
					<HandTruck className="text-ui-fg-subtle w-4 h-4 md:w-5 md:h-5" />
					<h1 className="text-sm md:text-base">Lieferanten</h1>
				</div>
				<Button size="small" variant="secondary" onClick={handleCreate}>
					<Plus className="w-4 h-4" />
					<span className="hidden sm:inline">Neuer Lieferant</span>
				</Button>
			</div>

			{/* Statistics Cards */}
			<div className="px-2 py-2 md:px-6 md:py-4 border-b">
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1 md:gap-4">
					<div className="bg-ui-bg-subtle rounded-lg p-1.5 md:p-4">
						<div className="flex items-center">
							<div className="ml-1 md:ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									Gesamt
								</div>
								<div className="text-sm md:text-lg font-semibold">{stats.total}</div>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-1.5 md:p-4">
						<div className="flex items-center">
							<div className="ml-1 md:ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									Aktive
								</div>
								<div className="text-sm md:text-lg font-semibold">{stats.active}</div>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-1.5 md:p-4">
						<div className="flex items-center">
							<div className="ml-1 md:ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									Kontakte
								</div>
								<div className="text-sm md:text-lg font-semibold">
									{stats.withContacts}
								</div>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-1.5 md:p-4">
						<div className="flex items-center">
							<div className="ml-1 md:ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									Adressen
								</div>
								<div className="text-sm md:text-lg font-semibold">
									{stats.withAddresses}
								</div>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-1.5 md:p-4">
						<div className="flex items-center">
							<div className="ml-1 md:ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									USt-ID
								</div>
								<div className="text-sm md:text-lg font-semibold">{stats.withVatId}</div>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-1.5 md:p-4">
						<div className="flex items-center">
							<div className="ml-1 md:ml-3">
								<div className="text-xs font-medium text-ui-fg-subtle">
									Bankdaten
								</div>
								<div className="text-sm md:text-lg font-semibold">
									{stats.withBankInfo}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Mobile Control Bar */}
			{isMobile && (
				<MobileControlBar
					onFilterClick={() => setShowFilterSheet(true)}
					onSortClick={() => setShowSortSheet(true)}
					onColumnsClick={() => setShowColumnSheet(true)}
					filterCount={0}
					sortLabel={sortConfig ? `${sortConfig.key} ${sortConfig.direction}` : undefined}
				/>
			)}

			{/* Search Bar */}
			<div className="px-2 py-2 md:px-6 md:py-4 border-b bg-ui-bg-subtle">
				<div className="flex items-center gap-x-2">
					<div className="relative flex-1">
						<div className="absolute inset-y-0 left-0 pl-2 md:pl-3 flex items-center pointer-events-none">
							<MagnifyingGlass className="h-4 w-4 text-ui-fg-muted" />
						</div>
						<Input
							placeholder="Suchen..."
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
							className="pl-8 md:pl-10 pr-8 md:pr-10 text-sm"
						/>
						{searchTerm && (
							<button
								onClick={handleClearSearch}
								className="absolute inset-y-0 right-0 pr-2 md:pr-3 flex items-center"
							>
								<XMark className="h-4 w-4 text-ui-fg-muted hover:text-ui-fg-base" />
							</button>
						)}
					</div>
				</div>

			{/* Results Info and Controls */}
			<div className="mt-2 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
					{/* Column Visibility Control */}
					<div className="hidden md:block">
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
					</div>

					{/* Result Amount Selector */}
					<Select value={pageSize.toString()} onValueChange={(value) => {
						setPageSize(parseInt(value));
						setCurrentPage(1);
					}}>
						<Select.Trigger className="w-20 md:w-32 text-xs md:text-sm">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="25">25<span className="hidden sm:inline"> pro Seite</span></Select.Item>
							<Select.Item value="50">50<span className="hidden sm:inline"> pro Seite</span></Select.Item>
							<Select.Item value="100">100<span className="hidden sm:inline"> pro Seite</span></Select.Item>
							<Select.Item value="200">200<span className="hidden sm:inline"> pro Seite</span></Select.Item>
						</Select.Content>
					</Select>

					<span className="text-xs md:text-sm text-ui-fg-muted">
						{isFetching
							? 'Lädt...'
							: `${suppliers.length} <span className="hidden sm:inline">Lieferanten</span><span className="sm:hidden">St.</span> • S. ${currentPage}/${totalPages}`}
						{searchTerm && ` • "${searchTerm}"`}
					</span>
				</div>

				{/* Pagination Controls */}
				{totalPages > 1 && (
					<div className="flex items-center gap-1 md:gap-2">
						<Button
							variant="secondary"
							size="small"
							onClick={handlePreviousPage}
							disabled={currentPage === 1 || isFetching}
							className="text-xs md:text-sm px-2 md:px-3"
						>
							<span className="hidden sm:inline">Zurück</span>
							<span className="sm:hidden">←</span>
						</Button>
						<span className="text-xs md:text-sm text-ui-fg-muted hidden sm:inline">
							Seite {currentPage} von {totalPages}
						</span>
						<Button
							variant="secondary"
							size="small"
							onClick={handleNextPage}
							disabled={currentPage >= totalPages || isFetching}
							className="text-xs md:text-sm px-2 md:px-3"
						>
							<span className="hidden sm:inline">Weiter</span>
							<span className="sm:hidden">→</span>
						</Button>
					</div>
				)}
			</div>
		</div>

		{/* Table */}
		<div className="flex-1 overflow-hidden">
			<div className="h-full overflow-auto px-2 py-2 md:px-6 md:py-4">
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
			{/* Mobile Bottom Sheets */}
			{isMobile && (
				<>
					{/* Filter Sheet */}
					<BottomSheet
						isOpen={showFilterSheet}
						onClose={() => setShowFilterSheet(false)}
						title="Filter"
					>
						<div className="space-y-6 pb-6">
							<div>
								<Text size="small" weight="plus" className="mb-2 block">
									Suche
								</Text>
								<Input
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									placeholder="Firma, Kontakt, E-Mail..."
								/>
							</div>

							<Button
								variant="secondary"
								className="w-full"
								onClick={() => {
									setSearchTerm("");
									setShowFilterSheet(false);
								}}
							>
								Alle Filter zurücksetzen
							</Button>
						</div>
					</BottomSheet>

					{/* Sort Sheet */}
					<BottomSheet
						isOpen={showSortSheet}
						onClose={() => setShowSortSheet(false)}
						title="Sortieren"
					>
						<div className="space-y-4 pb-6">
							<div>
								<Text size="small" weight="plus" className="mb-2 block">
									Sortieren nach
								</Text>
								<div className="grid grid-cols-1 gap-2">
									{[
										{ label: "Firma", value: "company" },
										{ label: "Ort", value: "city" },
										{ label: "Erstellt am", value: "created_at" },
									].map((opt) => (
										<Button
											key={opt.value}
											variant={sortConfig?.key === opt.value ? "primary" : "secondary"}
											className="justify-start"
											onClick={() => handleSort(opt.value)}
										>
											{opt.label}
										</Button>
									))}
								</div>
							</div>
							<div>
								<Text size="small" weight="plus" className="mb-2 block">
									Reihenfolge
								</Text>
								<div className="grid grid-cols-2 gap-2">
									<Button
										variant={sortConfig?.direction === "asc" ? "primary" : "secondary"}
										onClick={() => handleSort(sortConfig?.key || "company", "asc")}
									>
										Aufsteigend
									</Button>
									<Button
										variant={sortConfig?.direction === "desc" ? "primary" : "secondary"}
										onClick={() => handleSort(sortConfig?.key || "company", "desc")}
									>
										Absteigend
									</Button>
								</div>
							</div>
						</div>
					</BottomSheet>

					{/* Columns Sheet */}
					<BottomSheet
						isOpen={showColumnSheet}
						onClose={() => setShowColumnSheet(false)}
						title="Spalten anpassen"
					>
						<div className="space-y-4 pb-6">
							<div className="grid grid-cols-1 gap-3">
								{[
									{ key: 'company', label: 'Firma' },
									{ key: 'contacts', label: 'Kontaktinformation' },
									{ key: 'addresses', label: 'Adresse' },
									{ key: 'numbers', label: 'Nummern' },
									{ key: 'bank_info', label: 'Bankdaten' },
									{ key: 'actions', label: 'Aktionen' },
								].map((col) => (
									<div key={col.key} className="flex items-center justify-between">
										<Text size="small">{col.label}</Text>
										<Checkbox
											checked={visibleColumns.has(col.key)}
											onCheckedChange={(checked) => {
												const newVisible = new Set(visibleColumns);
												if (checked) newVisible.add(col.key);
												else newVisible.delete(col.key);
												setVisibleColumns(newVisible);
											}}
											disabled={col.key === "company" || col.key === "actions"}
										/>
									</div>
								))}
							</div>
						</div>
					</BottomSheet>
				</>
			)}
		</Container>
	);
};

// Route configuration
export const config = defineRouteConfig({
	label: 'Lieferanten',
	icon: HandTruck,
});

export default SuppliersPage;
