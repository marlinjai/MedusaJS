/**
 * page.tsx
 * Main manual customers page for admin UI
 * Displays customer list with filtering, statistics, and management actions
 */
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { MagnifyingGlass, Plus, User, XMark } from '@medusajs/icons';
import { Button, Container, Input, Select, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ColumnVisibilityControl from './components/ColumnVisibilityControl';
import ManualCustomerTable from './components/ManualCustomerTable';

// TypeScript types for our manual customer data
type ManualCustomer = {
	id: string;
	customer_number: string;
	first_name: string | null;
	last_name: string | null;
	company: string | null;
	email: string | null;
	phone: string | null;
	mobile: string | null;
	street: string | null;
	postal_code: string | null;
	city: string | null;
	country: string | null;
	customer_type: string;
	status: string;
	source: string | null;
	total_purchases: number;
	total_spent: number;
	created_at: string;
	updated_at: string;
};

const ManualCustomersPage = () => {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [searchTerm, setSearchTerm] = useState('');
	const [typeFilter, setTypeFilter] = useState('all');
	const [statusFilter, setStatusFilter] = useState('all');
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(50); // Show 50 customers per page

	// Column sorting and filtering state
	const [sortConfig, setSortConfig] = useState<{
		key: string;
		direction: 'asc' | 'desc';
	} | null>(null);
	const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>(
		{},
	);

	// Column visibility state
	const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
		const saved = localStorage.getItem('manual-customers-visible-columns');
		if (saved) {
			try {
				return new Set(JSON.parse(saved));
			} catch {
				// Default: all columns visible
			}
		}
		return new Set(['customer_number', 'name', 'contact', 'address', 'customer_type', 'status', 'total_purchases', 'total_spent', 'created_at', 'actions']);
	});

	// Persist visible columns
	useEffect(() => {
		localStorage.setItem('manual-customers-visible-columns', JSON.stringify([...visibleColumns]));
	}, [visibleColumns]);

	// Fetch manual customers with pagination
	const { data, isLoading, error, isFetching } = useQuery({
		queryKey: [
			'admin-manual-customers',
			searchTerm,
			typeFilter,
			statusFilter,
			currentPage,
			pageSize,
			sortConfig,
			columnFilters,
		],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (searchTerm) params.append('search', searchTerm);
			if (typeFilter !== 'all') params.append('customer_type', typeFilter);
			if (statusFilter !== 'all') params.append('status', statusFilter);

			// Add sorting parameters
			if (sortConfig) {
				params.append('sort_by', sortConfig.key);
				params.append('sort_direction', sortConfig.direction);
			}

			// Add column filters
			Object.entries(columnFilters).forEach(([key, value]) => {
				if (value) {
					params.append(`filter_${key}`, value);
				}
			});

			params.append('limit', pageSize.toString());
			params.append('offset', ((currentPage - 1) * pageSize).toString());

			const res = await fetch(`/admin/manual-customers?${params.toString()}`, {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch manual customers');
			return res.json();
		},
		staleTime: 30000, // Cache for 30 seconds
		gcTime: 600000,
		placeholderData: previousData => previousData, // Keep previous data while loading
	});

	// Prefetch adjacent pages for seamless navigation
	const prefetchAdjacentPages = async (
		centerPage: number,
		totalPages: number,
	) => {
		const pagesToPrefetch = [];

		// Prefetch next 5 pages
		for (let i = 1; i <= 5; i++) {
			const nextPage = centerPage + i;
			if (nextPage <= totalPages) {
				pagesToPrefetch.push(nextPage);
			}
		}

		// Prefetch previous 5 pages
		for (let i = 1; i <= 5; i++) {
			const prevPage = centerPage - i;
			if (prevPage >= 1) {
				pagesToPrefetch.push(prevPage);
			}
		}

		// Prefetch each page (with some delay to avoid overwhelming the server)
		const prefetchPromises = pagesToPrefetch.map((page, index) => {
			return new Promise(resolve => {
				setTimeout(async () => {
					const params = new URLSearchParams();
					if (searchTerm) params.append('search', searchTerm);
					if (typeFilter !== 'all') params.append('customer_type', typeFilter);
					if (statusFilter !== 'all') params.append('status', statusFilter);

					// Add sorting parameters
					if (sortConfig) {
						params.append('sort_by', sortConfig.key);
						params.append('sort_direction', sortConfig.direction);
					}

					// Add column filters
					Object.entries(columnFilters).forEach(([key, value]) => {
						if (value) {
							params.append(`filter_${key}`, value);
						}
					});

					params.append('limit', pageSize.toString());
					params.append('offset', ((page - 1) * pageSize).toString());

					try {
						await queryClient.prefetchQuery({
							queryKey: [
								'admin-manual-customers',
								searchTerm,
								typeFilter,
								statusFilter,
								page,
								pageSize,
								sortConfig,
								columnFilters,
							],
							queryFn: async () => {
								const res = await fetch(
									`/admin/manual-customers?${params.toString()}`,
									{
										credentials: 'include',
									},
								);
								if (!res.ok)
									throw new Error('Failed to fetch manual customers');
								return res.json();
							},
							staleTime: 30000,
							gcTime: 600000,
						});
					} catch (error) {
						console.warn(`Failed to prefetch page ${page}:`, error);
					}

					resolve(page);
				}, index * 50); // 50ms delay between each prefetch
			});
		});

		// Wait for all prefetching to complete
		await Promise.all(prefetchPromises);
	};

	const customers = data?.customers || [];
	const stats = data?.stats || {
		total: 0,
		active: 0,
		inactive: 0,
		legacy: 0,
		walkIn: 0,
		business: 0,
		withEmail: 0,
		withPhone: 0,
		totalSpent: 0,
	};

	const totalPages = Math.ceil((data?.total || 0) / pageSize);

	// Trigger prefetching when current page loads successfully
	useEffect(() => {
		if (data && !isLoading && !isFetching && totalPages > 1) {
			// Small delay to avoid overwhelming the server
			const timer = setTimeout(() => {
				prefetchAdjacentPages(currentPage, totalPages);
			}, 100);

			return () => clearTimeout(timer);
		}
	}, [
		data,
		isLoading,
		isFetching,
		currentPage,
		totalPages,
		searchTerm,
		typeFilter,
		statusFilter,
		sortConfig,
		columnFilters,
	]);

	// Delete manual customer
	const deleteCustomer = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/admin/manual-customers/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Fehler beim Löschen des Kunden');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['admin-manual-customers'] });
			toast.success('Kunde erfolgreich gelöscht');
		},
		onError: (e: any) => toast.error(e.message),
	});

	// Handlers
	const handleCreate = () => navigate('/manual-customers/new');
	const handleEdit = (customer: ManualCustomer) =>
		navigate(`/manual-customers/${customer.id}`);
	const handleDelete = (id: string) => deleteCustomer.mutate(id);
	const handleImport = () => navigate('/manual-customers/import');
	const handleClearSearch = () => {
		setSearchTerm('');
		setCurrentPage(1);
	};

	// Reset page when filters change
	const handleTypeFilterChange = (value: string) => {
		setTypeFilter(value);
		setCurrentPage(1);
	};

	const handleStatusFilterChange = (value: string) => {
		setStatusFilter(value);
		setCurrentPage(1);
	};

	const handleSearchChange = (value: string) => {
		setSearchTerm(value);
		setCurrentPage(1);
	};

	// Handle column sorting
	const handleSort = (key: string, direction: 'asc' | 'desc') => {
		if (key === '') {
			// Clear sort
			setSortConfig(null);
		} else {
			setSortConfig({ key, direction });
		}
		setCurrentPage(1); // Reset to first page when sorting
	};

	// Handle column filtering
	const handleColumnFilter = (filters: { [key: string]: string }) => {
		setColumnFilters(filters);
		setCurrentPage(1); // Reset to first page when filtering
	};

	// Pagination handlers
	const handlePreviousPage = () => {
		if (currentPage > 1) {
			setCurrentPage(currentPage - 1);
			// Check if we have prefetched data for this page
			const queryKey = [
				'admin-manual-customers',
				searchTerm,
				typeFilter,
				statusFilter,
				currentPage - 1,
				pageSize,
				sortConfig,
				columnFilters,
			];
			const cachedData = queryClient.getQueryData(queryKey);
			if (cachedData) {
				// Data is already available, navigation will be instant
				console.log('Using prefetched data for page', currentPage - 1);
			}
		}
	};

	const handleNextPage = () => {
		if (currentPage < totalPages) {
			setCurrentPage(currentPage + 1);
			// Check if we have prefetched data for this page
			const queryKey = [
				'admin-manual-customers',
				searchTerm,
				typeFilter,
				statusFilter,
				currentPage + 1,
				pageSize,
				sortConfig,
				columnFilters,
			];
			const cachedData = queryClient.getQueryData(queryKey);
			if (cachedData) {
				// Data is already available, navigation will be instant
				console.log('Using prefetched data for page', currentPage + 1);
			}
		}
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		// Check if we have prefetched data for this page
		const queryKey = [
			'admin-manual-customers',
			searchTerm,
			typeFilter,
			statusFilter,
			page,
			pageSize,
			sortConfig,
			columnFilters,
		];
		const cachedData = queryClient.getQueryData(queryKey);
		if (cachedData) {
			// Data is already available, navigation will be instant
			console.log('Using prefetched data for page', page);
		}
	};

	// Format currency
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: 'EUR',
		}).format(amount / 100);
	};

	if (error) {
		return (
			<Container>
				<Text className="text-red-500">
					Fehler beim Laden der Kunden: {error.message}
				</Text>
			</Container>
		);
	}

	return (
		<Container className="divide-y p-0 h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
				<div className="flex items-center gap-x-2">
					<User className="text-ui-fg-subtle" />
					<h1 className="text-lg font-semibold">Manuelle Kunden</h1>
				</div>
				<div className="flex items-center gap-x-2">
					<Button size="small" variant="secondary" onClick={handleImport}>
						<Plus />
						CSV Import
					</Button>
					<Button size="small" variant="secondary" onClick={handleCreate}>
						<Plus />
						Neuer Kunde
					</Button>
				</div>
			</div>

			{/* Statistics Cards */}
			<div className="px-6 py-4 border-b">
				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<Text className="text-xs font-medium text-ui-fg-subtle">
									Kunden gesamt
								</Text>
								<Text className="text-lg font-semibold">{stats.total}</Text>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<Text className="text-xs font-medium text-ui-fg-subtle">
									Aktive
								</Text>
								<Text className="text-lg font-semibold">{stats.active}</Text>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<Text className="text-xs font-medium text-ui-fg-subtle">
									Legacy
								</Text>
								<Text className="text-lg font-semibold">{stats.legacy}</Text>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<Text className="text-xs font-medium text-ui-fg-subtle">
									Laufkundschaft
								</Text>
								<Text className="text-lg font-semibold">{stats.walkIn}</Text>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<Text className="text-xs font-medium text-ui-fg-subtle">
									Mit E-Mail
								</Text>
								<Text className="text-lg font-semibold">{stats.withEmail}</Text>
							</div>
						</div>
					</div>

					<div className="bg-ui-bg-subtle rounded-lg p-4">
						<div className="flex items-center">
							<div className="ml-3">
								<Text className="text-xs font-medium text-ui-fg-subtle">
									Gesamtumsatz
								</Text>
								<Text className="text-lg font-semibold">
									{formatCurrency(stats.totalSpent)}
								</Text>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Filters */}
			<div className="px-6 py-4 border-b bg-ui-bg-subtle">
				<div className="flex items-center gap-x-4">
					{/* Search Bar */}
					<div className="relative flex-1">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<MagnifyingGlass className="h-4 w-4 text-ui-fg-muted" />
						</div>
						<Input
							placeholder="Suchen nach Name, Firma, E-Mail, Telefon, Kundennummer..."
							value={searchTerm}
							onChange={e => handleSearchChange(e.target.value)}
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

					{/* Type Filter */}
					<Select value={typeFilter} onValueChange={handleTypeFilterChange}>
						<Select.Trigger className="w-40">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">Alle Typen</Select.Item>
							<Select.Item value="legacy">Legacy</Select.Item>
							<Select.Item value="walk-in">Laufkundschaft</Select.Item>
							<Select.Item value="business">Geschäftskunde</Select.Item>
						</Select.Content>
					</Select>

					{/* Status Filter */}
					<Select value={statusFilter} onValueChange={handleStatusFilterChange}>
						<Select.Trigger className="w-32">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">Alle Status</Select.Item>
							<Select.Item value="active">Aktiv</Select.Item>
							<Select.Item value="inactive">Inaktiv</Select.Item>
							<Select.Item value="blocked">Blockiert</Select.Item>
						</Select.Content>
					</Select>
				</div>

			{/* Filter Results Info and Controls */}
			<div className="mt-2 flex justify-between items-center">
				<div className="flex items-center gap-3">
					{/* Column Visibility Control */}
					<ColumnVisibilityControl
						columns={[
							{ key: 'customer_number', label: 'Kundennummer', width: 90 },
							{ key: 'name', label: 'Name / Firma', width: 200 },
							{ key: 'contact', label: 'Kontakt', width: 180 },
							{ key: 'address', label: 'Adresse', width: 200 },
							{ key: 'customer_type', label: 'Typ', width: 100 },
							{ key: 'status', label: 'Status', width: 100 },
							{ key: 'total_purchases', label: 'Käufe', width: 80 },
							{ key: 'total_spent', label: 'Umsatz', width: 100 },
							{ key: 'created_at', label: 'Erstellt', width: 120 },
							{ key: 'actions', label: 'Aktionen', width: 100 },
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
							setVisibleColumns(new Set(['customer_number', 'name', 'contact', 'address', 'customer_type', 'status', 'total_purchases', 'total_spent', 'created_at', 'actions']));
						}}
						onHideAll={() => {
							setVisibleColumns(new Set(['customer_number', 'name', 'actions']));
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

					<Text className="text-sm text-ui-fg-muted">
						{isFetching
							? 'Wird geladen...'
							: `${customers.length} Kunden auf Seite ${currentPage} von ${totalPages}`}
						{searchTerm && ` • Suche: "${searchTerm}"`}
						{typeFilter !== 'all' && ` • Typ: ${typeFilter}`}
						{statusFilter !== 'all' && ` • Status: ${statusFilter}`}
						{data?.total && ` • Gesamt: ${data.total} Kunden`}
					</Text>
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

							<div className="flex items-center gap-1">
								{/* Always show first page */}
								<Button
									variant={currentPage === 1 ? 'primary' : 'secondary'}
									size="small"
									onClick={() => handlePageChange(1)}
									disabled={isFetching}
									className="min-w-[36px]"
								>
									1
								</Button>

								{/* Show ... if needed */}
								{currentPage > 4 && totalPages > 6 && (
									<Text className="text-sm text-ui-fg-muted mx-1">...</Text>
								)}

								{/* Show window of pages around current */}
								{Array.from({ length: 5 }, (_, i) => {
									const page = currentPage - 2 + i;
									if (page > 1 && page < totalPages) {
										return (
											<Button
												key={page}
												variant={page === currentPage ? 'primary' : 'secondary'}
												size="small"
												onClick={() => handlePageChange(page)}
												disabled={isFetching}
												className="min-w-[36px]"
											>
												{page}
											</Button>
										);
									}
									return null;
								})}

								{/* Show ... if needed */}
								{currentPage < totalPages - 3 && totalPages > 6 && (
									<Text className="text-sm text-ui-fg-muted mx-1">...</Text>
								)}

								{/* Always show last page if more than 1 */}
								{totalPages > 1 && (
									<Button
										variant={
											currentPage === totalPages ? 'primary' : 'secondary'
										}
										size="small"
										onClick={() => handlePageChange(totalPages)}
										disabled={isFetching}
										className="min-w-[36px]"
									>
										{totalPages}
									</Button>
								)}
							</div>

							<Button
								variant="secondary"
								size="small"
								onClick={handleNextPage}
								disabled={currentPage === totalPages || isFetching}
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
				<ManualCustomerTable
					customers={customers}
					onEdit={handleEdit}
					onDelete={handleDelete}
					isLoading={isLoading && currentPage === 1} // Only show loading on initial load
					isFetching={isFetching}
					onSort={handleSort}
					onFilter={handleColumnFilter}
					sortConfig={sortConfig}
					filters={columnFilters}
					visibleColumns={visibleColumns}
				/>
				</div>
			</div>
		</Container>
	);
};

// Route configuration
export const config = defineRouteConfig({
	label: 'Manuelle Kunden',
	icon: User,
});

export default ManualCustomersPage;
