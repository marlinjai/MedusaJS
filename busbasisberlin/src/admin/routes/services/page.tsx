/**
 * services/by-category/page.tsx
 * Main services admin page organized by category tree with table view
 * Replaces the old flat services list page
 */
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { HandTruck } from '@medusajs/icons';
import { Button, Checkbox, Container, Select, Text } from '@medusajs/ui';
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import BulkActions from './components-advanced/BulkActions';
import PriceAdjustmentModal from './components-advanced/PriceAdjustmentModal';
import ServiceTableAdvanced from './components-advanced/ServiceTableAdvanced';
import { BottomSheet, FloatingActionButton } from '../../components/BottomSheet';
import { MobileControlBar } from '../../components/MobileControlBar';
import { useIsMobile } from '../../utils/use-mobile';

// Service category tree node
type ServiceCategoryNode = {
	name: string;
	path: string;
	count: number;
	children: ServiceCategoryNode[];
	level: number;
};

// Service type matching backend
type Service = {
	id: string;
	title: string;
	service_code: string | null;
	description: string | null;
	category: string | null;
	category_level_1: string | null;
	category_level_2: string | null;
	category_level_3: string | null;
	category_level_4: string | null;
	base_price: number | null;
	service_type: string | null;
	status: string;
	is_active: boolean;
	currency_code: string;
};

// Category Tree Component
function CategoryTree({
	categories,
	selectedCategories,
	onToggleCategory,
	expandedCategories,
	onToggleExpand,
	level = 0,
}: {
	categories: ServiceCategoryNode[];
	selectedCategories: Set<string>;
	onToggleCategory: (path: string) => void;
	expandedCategories: Set<string>;
	onToggleExpand: (path: string) => void;
	level?: number;
}) {
	return (
		<div className="space-y-1">
			{categories.map(category => {
				const hasChildren = category.children.length > 0;
				const isExpanded = expandedCategories.has(category.path);
				const isSelected = selectedCategories.has(category.path);

				return (
					<div key={category.path} className="flex flex-col">
						<div
							className="flex items-center gap-2 py-1 px-2 hover:bg-ui-bg-subtle rounded cursor-pointer"
							style={{ paddingLeft: `${level * 16 + 8}px` }}
						>
							{hasChildren && (
								<button
									onClick={e => {
										e.stopPropagation();
										onToggleExpand(category.path);
									}}
									className="p-0.5"
								>
									{isExpanded ? (
										<ChevronDown className="w-4 h-4" />
									) : (
										<ChevronRight className="w-4 h-4" />
									)}
								</button>
							)}
							{!hasChildren && <div className="w-5" />}
							<Checkbox
								checked={isSelected}
								onCheckedChange={() => onToggleCategory(category.path)}
							/>
							<Text
								size="small"
								onClick={() => onToggleCategory(category.path)}
								className="flex-1 cursor-pointer"
							>
								{category.name} ({category.count})
							</Text>
						</div>
						{hasChildren && isExpanded && (
							<CategoryTree
								categories={category.children}
								selectedCategories={selectedCategories}
								onToggleCategory={onToggleCategory}
								expandedCategories={expandedCategories}
								onToggleExpand={onToggleExpand}
								level={level + 1}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

export const config = defineRouteConfig({
	label: 'Dienstleistungen',
	icon: HandTruck,
});

export default function ServicesByCategoryPage() {
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const [categories, setCategories] = useState<ServiceCategoryNode[]>([]);
	const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
		new Set(),
	);
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set(),
	);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [showBottomSheet, setShowBottomSheet] = useState(false);
	const [showSortSheet, setShowSortSheet] = useState(false);
	const [showColumnSheet, setShowColumnSheet] = useState(false);
	const [services, setServices] = useState<Service[]>([]);
	const [totalServices, setTotalServices] = useState(0);
	const [loading, setLoading] = useState(false);
	const [loadingCategories, setLoadingCategories] = useState(false);
	const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
	const [showPriceModal, setShowPriceModal] = useState(false);

	// Pagination state
	const [limit, setLimit] = useState(() => {
		const saved = localStorage.getItem('services-pagination-limit');
		return saved ? parseInt(saved) : 50;
	});
	const [offset, setOffset] = useState(0);

	// Fetch categories on mount
	useEffect(() => {
		fetchCategories();
	}, []);

	// Fetch services when categories or pagination change
	useEffect(() => {
		if (selectedCategories.size > 0) {
			fetchServices();
		} else {
			setServices([]);
			setTotalServices(0);
		}
	}, [selectedCategories, limit, offset]);

	// Persist limit preference
	useEffect(() => {
		localStorage.setItem('services-pagination-limit', limit.toString());
	}, [limit]);

	const fetchCategories = async () => {
		setLoadingCategories(true);
		try {
			const response = await fetch('/admin/service-categories/tree');
			const data = await response.json();
			setCategories(data.categories || []);

			// Auto-select "Arbeitspositionen" category by default if nothing is selected
			if (selectedCategories.size === 0 && data.categories?.length > 0) {
				const arbeitspositionenCategory = data.categories.find(
					(cat: ServiceCategoryNode) => cat.name === 'Arbeitspositionen',
				);
				if (arbeitspositionenCategory) {
					const newSelection = new Set([arbeitspositionenCategory.path]);
					setSelectedCategories(newSelection);
					setExpandedCategories(new Set([arbeitspositionenCategory.path]));

					// Manually trigger initial fetch since state update is async
					fetchServicesWithCategories(newSelection);
				}
			}
		} catch (error) {
			console.error('Failed to fetch service categories:', error);
		} finally {
			setLoadingCategories(false);
		}
	};

	// Recursive function to collect all child category paths
	const collectAllChildPaths = (node: ServiceCategoryNode): string[] => {
		const paths = [node.path];
		for (const child of node.children) {
			paths.push(...collectAllChildPaths(child));
		}
		return paths;
	};

	// Get all category paths including children when parent is selected
	const getAllCategoryPaths = (categoriesToUse?: Set<string>): string[] => {
		const allPaths: string[] = [];
		const categoriesSet = categoriesToUse || selectedCategories;

		for (const selectedPath of categoriesSet) {
			// Find the node in the tree
			const findNode = (
				nodes: ServiceCategoryNode[],
			): ServiceCategoryNode | null => {
				for (const node of nodes) {
					if (node.path === selectedPath) return node;
					const found = findNode(node.children);
					if (found) return found;
				}
				return null;
			};

			const node = findNode(categories);
			if (node) {
				// Collect this node and all children
				allPaths.push(...collectAllChildPaths(node));
			}
		}

		return Array.from(new Set(allPaths)); // Remove duplicates
	};

	const fetchServicesWithCategories = async (categoriesToUse?: Set<string>) => {
		setLoading(true);
		try {
			const allPaths = getAllCategoryPaths(categoriesToUse);

			// Extract category_level_2 from each path
			const categoryFilters = Array.from(
				new Set(
					allPaths.map(path => {
						const parts = path.split(' > ');
						return parts[1] || parts[0];
					}),
				),
			);

			// #region agent log
			fetch(
				'http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						location: 'page.tsx:227',
						message: 'Fetching services',
						data: {
							selectedCategoriesSize: selectedCategories.size,
							allPaths,
							categoryFilters,
						},
						timestamp: Date.now(),
						sessionId: 'debug-session',
						hypothesisId: 'C',
					}),
				},
			).catch(() => {});
			// #endregion

			// Fetch services for all categories
			const allServices: Service[] = [];
			for (const category of categoryFilters) {
				const response = await fetch(
					`/admin/services?category=${encodeURIComponent(category)}&limit=10000`,
				);

				// #region agent log
				fetch(
					'http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							location: 'page.tsx:246',
							message: 'Service API response',
							data: { category, status: response.status, ok: response.ok },
							timestamp: Date.now(),
							sessionId: 'debug-session',
							hypothesisId: 'A,E',
						}),
					},
				).catch(() => {});
				// #endregion

				const data = await response.json();

				// #region agent log
				fetch(
					'http://127.0.0.1:7242/ingest/8dec15ee-be69-4a0f-a1bf-ccc71cc82934',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							location: 'page.tsx:249',
							message: 'Service data received',
							data: {
								category,
								servicesCount: data.services?.length || 0,
								hasError: !!data.error,
							},
							timestamp: Date.now(),
							sessionId: 'debug-session',
							hypothesisId: 'C,D',
						}),
					},
				).catch(() => {});
				// #endregion

				if (data.services) {
					allServices.push(...data.services);
				}
			}

			// Remove duplicates by id
			const uniqueServices = Array.from(
				new Map(allServices.map(s => [s.id, s])).values(),
			);

			// Apply pagination
			setTotalServices(uniqueServices.length);
			const paginatedServices = uniqueServices.slice(offset, offset + limit);
			setServices(paginatedServices);
		} catch (error) {
			console.error('Failed to fetch services:', error);
			setServices([]);
			setTotalServices(0);
		} finally {
			setLoading(false);
		}
	};

	const fetchServices = async () => {
		return fetchServicesWithCategories();
	};

	const toggleCategory = (path: string) => {
		setSelectedCategories(prev => {
			const newSet = new Set(prev);
			if (newSet.has(path)) {
				newSet.delete(path);
			} else {
				newSet.add(path);
			}
			return newSet;
		});
	};

	const toggleExpand = (path: string) => {
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

	const handleEditService = (service: Service) => {
		navigate(`/services/${service.id}`);
	};

	const handleDeleteService = async (serviceId: string) => {
		if (
			!window.confirm(
				'Sind Sie sicher, dass Sie diesen Service löschen möchten?',
			)
		) {
			return;
		}

		try {
			const response = await fetch(`/admin/services/${serviceId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Fehler beim Löschen des Service');
			}

			// Refresh services
			await fetchServices();
		} catch (error: any) {
			console.error('Error deleting service:', error);
		}
	};

	const handleUpdateService = async (
		serviceId: string,
		updates: Partial<Service>,
	) => {
		try {
			const response = await fetch(`/admin/services/${serviceId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				// Extract actual error message from backend
				const errorData = await response.json().catch(() => ({}));
				const errorMessage =
					errorData?.message ||
					errorData?.error ||
					`Fehler ${response.status}: Speichern fehlgeschlagen`;
				throw new Error(errorMessage);
			}

			// Refresh services
			await fetchServices();
		} catch (error: any) {
			// Re-throw with the actual error message for display
			throw new Error(error.message || 'Fehler beim Speichern');
		}
	};

	// Bulk action handlers
	const handleBulkStatusUpdate = async (newStatus: 'active' | 'inactive') => {
		try {
			const selectedIds = Object.keys(rowSelection);
			const response = await fetch('/admin/services/bulk-update', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					service_ids: selectedIds,
					updates: {
						is_active: newStatus === 'active',
						status: newStatus,
					},
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to update services');
			}

			// Refresh and clear selection
			await fetchServices();
			setRowSelection({});
		} catch (error) {
			console.error('Bulk status update failed:', error);
		}
	};

	const handlePriceAdjustment = async (
		adjustments: Array<{ id: string; newPrice: number }>,
	) => {
		try {
			const response = await fetch('/admin/services/bulk-update', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					service_ids: adjustments.map(a => a.id),
					price_adjustments: adjustments,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to adjust prices');
			}

			// Refresh and clear selection
			await fetchServices();
			setRowSelection({});
		} catch (error) {
			console.error('Price adjustment failed:', error);
		}
	};

	return (
		<Container className="p-0 md:p-6 h-[calc(100vh-120px)] flex flex-col">
			<div className="flex items-center justify-between px-2 py-1.5 md:px-0 md:py-0 md:mb-6 mb-2 flex-shrink-0">
				<div>
					<Text size="xlarge" weight="plus" className="text-ui-fg-base text-sm md:text-xl">
						Dienstleistungen
					</Text>
					<Text size="small" className="text-ui-fg-subtle text-xs md:text-sm hidden sm:block">
						Verwalten Sie Services organisiert nach Kategorien
					</Text>
				</div>
				<Button onClick={() => navigate('/services/new')} size="small">
					<Plus className="w-4 h-4 md:mr-2" />
					<span className="hidden sm:inline">Neuer Service</span>
				</Button>
			</div>

			{/* Mobile Control Bar */}
			{isMobile && (
				<MobileControlBar
					onFilterClick={() => setShowBottomSheet(true)}
					onSortClick={() => setShowSortSheet(true)}
					onColumnsClick={() => setShowColumnSheet(true)}
					filterCount={selectedCategories.size}
				/>
			)}

			<div className="flex gap-2 md:gap-6 flex-1 min-h-0">
				{/* Left Sidebar - Category Tree (Collapsible) - Hidden on mobile */}
				<div
					className={`hidden md:flex ${sidebarCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 overflow-hidden flex-shrink-0 flex-col`}
				>
					<div className="bg-ui-bg-subtle rounded-lg p-4 flex flex-col h-full">
						<Text size="large" weight="plus" className="mb-4 flex-shrink-0">
							Kategorien
						</Text>
						{loadingCategories ? (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ui-fg-base"></div>
							</div>
						) : (
							<div className="flex-1 overflow-y-auto min-h-0">
								<CategoryTree
									categories={categories}
									selectedCategories={selectedCategories}
									onToggleCategory={toggleCategory}
									expandedCategories={expandedCategories}
									onToggleExpand={toggleExpand}
								/>
							</div>
						)}
					</div>
				</div>

				{/* Toggle Button - Hidden on mobile */}
				<button
					onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
					className="hidden md:flex flex-shrink-0 w-6 h-12 self-center rounded-md border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle transition-colors items-center justify-center"
					title={sidebarCollapsed ? 'Sidebar einblenden' : 'Sidebar ausblenden'}
				>
					{sidebarCollapsed ? (
						<ChevronRight className="w-4 h-4" />
					) : (
						<ChevronLeft className="w-4 h-4" />
					)}
				</button>

				{/* Main Content - Services Table */}
				<div className="flex-1 flex flex-col min-h-0">
					<div className="flex-1 flex flex-col bg-ui-bg-subtle rounded-lg p-2 md:p-6 min-h-0">
						{/* Header with pagination controls */}
						<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 md:gap-4 mb-2 md:mb-4 flex-shrink-0">
							<div className="flex items-center gap-2 md:gap-4">
								<Text size="base" weight="plus" className="text-xs md:text-base">
									{selectedCategories.size === 0
										? 'Alle Services'
										: `${totalServices} Service(s)`}
								</Text>
								{totalServices > 0 && (
									<Text size="small" className="text-ui-fg-subtle text-xs hidden sm:inline">
										{offset + 1}-{Math.min(offset + limit, totalServices)} von{' '}
										{totalServices}
									</Text>
								)}
							</div>

							{/* Pagination controls */}
							<div className="flex items-center gap-2 md:gap-3">
								<Text size="small" className="text-ui-fg-subtle text-xs hidden sm:inline">
									Pro Seite:
								</Text>
								<Select
									value={limit.toString()}
									onValueChange={v => {
										setLimit(parseInt(v));
										setOffset(0);
									}}
								>
									<Select.Trigger className="w-16 md:w-24 text-xs md:text-sm">
										<Select.Value />
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="25">25</Select.Item>
										<Select.Item value="50">50</Select.Item>
										<Select.Item value="100">100</Select.Item>
										<Select.Item value="250">250</Select.Item>
										<Select.Item value="500">500</Select.Item>
									</Select.Content>
								</Select>

								{/* Prev/Next buttons */}
								<div className="flex items-center gap-1 md:gap-2">
									<Button
										variant="secondary"
										size="small"
										disabled={offset === 0}
										onClick={() => setOffset(Math.max(0, offset - limit))}
										className="text-xs md:text-sm px-2 md:px-3"
									>
										<span className="hidden sm:inline">Zurück</span>
										<span className="sm:hidden">←</span>
									</Button>
									<Button
										variant="secondary"
										size="small"
										disabled={offset + limit >= totalServices}
										onClick={() => setOffset(offset + limit)}
										className="text-xs md:text-sm px-2 md:px-3"
									>
										<span className="hidden sm:inline">Weiter</span>
										<span className="sm:hidden">→</span>
									</Button>
								</div>
							</div>
						</div>

						{/* Bulk Actions Toolbar */}
						<div className="flex-shrink-0">
							<BulkActions
								selectedCount={Object.keys(rowSelection).length}
								onClearSelection={() => setRowSelection({})}
								onBulkStatusUpdate={handleBulkStatusUpdate}
								onOpenPriceAdjustment={() => setShowPriceModal(true)}
							/>
						</div>

						{/* Scrollable Table Container */}
						<div className="flex-1 overflow-auto min-h-0">
							<ServiceTableAdvanced
								services={services}
								onEdit={handleEditService}
								onDelete={handleDeleteService}
								onUpdate={handleUpdateService}
								isLoading={loading}
								rowSelection={rowSelection}
								onRowSelectionChange={setRowSelection}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Mobile: Floating Action Button to open category filters */}
			{isMobile && (
				<FloatingActionButton
					onClick={() => setShowBottomSheet(true)}
					label="Kategorien filtern"
					icon={<Filter className="w-5 h-5" />}
				/>
			)}

			{/* Mobile: Bottom Sheet for categories */}
			<BottomSheet
				isOpen={showBottomSheet}
				onClose={() => setShowBottomSheet(false)}
				title="Kategorien"
			>
				{loadingCategories ? (
					<div className="flex items-center justify-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ui-fg-base"></div>
					</div>
				) : (
					<CategoryTree
						categories={categories}
						selectedCategories={selectedCategories}
						onToggleCategory={toggleCategory}
						expandedCategories={expandedCategories}
						onToggleExpand={toggleExpand}
					/>
				)}
			</BottomSheet>

			{/* Sort Bottom Sheet */}
			<BottomSheet
				isOpen={showSortSheet}
				onClose={() => setShowSortSheet(false)}
				title="Sortieren"
			>
				<div className="space-y-4 pb-6">
					<Text size="small" className="text-ui-fg-subtle">
						Sortieroptionen für Dienstleistungen sind auf der Desktop-Version verfügbar.
					</Text>
				</div>
			</BottomSheet>

			{/* Columns Bottom Sheet */}
			<BottomSheet
				isOpen={showColumnSheet}
				onClose={() => setShowColumnSheet(false)}
				title="Spalten"
			>
				<div className="space-y-4 pb-6">
					<Text size="small" className="text-ui-fg-subtle">
						Spaltenauswahl ist auf der Desktop-Version verfügbar.
					</Text>
				</div>
			</BottomSheet>

			{/* Price Adjustment Modal */}
			<PriceAdjustmentModal
				isOpen={showPriceModal}
				onClose={() => setShowPriceModal(false)}
				selectedServices={services.filter(s => rowSelection[s.id])}
				onApply={handlePriceAdjustment}
			/>
		</Container>
	);
}
