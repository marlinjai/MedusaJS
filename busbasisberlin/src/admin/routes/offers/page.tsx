/**
 * page.tsx
 * Main offers page for admin UI
 * Displays offer list with filtering, statistics, and management actions
 */
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { MagnifyingGlass, Plus } from '@medusajs/icons';
import { CheckCircle, Clock, FileText, TrendingUp, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Container, Input, Text, toast } from '@medusajs/ui';
import OfferTable from './components/OfferTable';

// TypeScript types for our offer data
type OfferStatus = 'draft' | 'active' | 'accepted' | 'completed' | 'cancelled';

interface OfferItem {
	id: string;
	title: string;
	quantity: number;
	unit_price: number;
	total_price: number;
	item_type: 'product' | 'service';
}

interface Offer {
	id: string;
	offer_number: string;
	title: string;
	description?: string;
	status: OfferStatus;
	customer_name?: string;
	customer_email?: string;
	total_amount: number;
	currency_code: string;
	valid_until?: string;
	created_at: string;
	updated_at: string;
	items: OfferItem[];
}

interface OfferStatistics {
	total: number;
	draft: number;
	active: number;
	accepted: number;
	completed: number;
	cancelled: number;
	// Value sums by status (in cents)
	draftValue?: number;
	activeValue?: number;
	acceptedValue?: number;
	completedValue?: number;
	cancelledValue?: number;
	// Total value (excludes cancelled and draft)
	totalValue: number;
}

const OffersPage = () => {
	const [offers, setOffers] = useState<Offer[]>([]);
	const [stats, setStats] = useState<OfferStatistics>({
		total: 0,
		draft: 0,
		active: 0,
		accepted: 0,
		completed: 0,
		cancelled: 0,
		totalValue: 0,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filters
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [searchTerm, setSearchTerm] = useState('');

	// Sorting and filtering state
	const [sortConfig, setSortConfig] = useState<{
		key: string;
		direction: 'asc' | 'desc';
	} | null>(null);
	const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>(
		{},
	);

	const navigate = useNavigate();

	// Fetch offers from API
	const fetchOffers = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();

			if (statusFilter !== 'all') {
				params.append('status', statusFilter);
			}

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

			const response = await fetch(`/admin/offers?${params.toString()}`);
			const data = await response.json();

			if (response.ok) {
				setOffers(data.offers || []);
				setStats(
					data.stats || {
						total: 0,
						draft: 0,
						active: 0,
						accepted: 0,
						completed: 0,
						cancelled: 0,
						draftValue: 0,
						activeValue: 0,
						acceptedValue: 0,
						completedValue: 0,
						cancelledValue: 0,
						totalValue: 0,
					},
				);
			} else {
				setError(data.message || 'Fehler beim Laden der Angebote');
				toast.error('Fehler beim Laden der Angebote');
			}
		} catch (err) {
			setError('Fehler beim Laden der Angebote');
			toast.error('Fehler beim Laden der Angebote');
			console.error('Error fetching offers:', err);
		} finally {
			setLoading(false);
		}
	};

	// Load offers on component mount and when filters change
	useEffect(() => {
		fetchOffers();
	}, [statusFilter, sortConfig, columnFilters]);

	// Filter offers based on search term
	const filteredOffers = offers.filter(
		offer =>
			offer.offer_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
			offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(offer.customer_name &&
				offer.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
			(offer.customer_email &&
				offer.customer_email.toLowerCase().includes(searchTerm.toLowerCase())),
	);

	// Handle sorting
	const handleSort = (key: string, direction: 'asc' | 'desc') => {
		setSortConfig({ key, direction });
	};

	// Handle column filtering
	const handleColumnFilter = (filters: { [key: string]: string }) => {
		setColumnFilters(filters);
	};

	// Handle creating a new offer
	const handleCreateOffer = () => {
		navigate('/offers/new');
	};

	// Handle viewing an offer
	const handleViewOffer = (offer: Offer) => {
		navigate(`/offers/${offer.id}`);
	};

	// Handle editing an offer
	const handleEditOffer = (offer: Offer) => {
		navigate(`/offers/${offer.id}`);
	};

	// Handle deleting an offer
	const handleDeleteOffer = async (offerId: string) => {
		if (
			!window.confirm(
				'Sind Sie sicher, dass Sie dieses Angebot löschen möchten?',
			)
		) {
			return;
		}

		try {
			const response = await fetch(`/admin/offers/${offerId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Fehler beim Löschen des Angebots');
			}

			toast.success('Angebot erfolgreich gelöscht');
			// Refresh the offers list
			fetchOffers();
		} catch (error) {
			console.error('Error deleting offer:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'Fehler beim Löschen des Angebots',
			);
		}
	};

	if (loading) {
		return (
			<Container className="py-8">
				<div className="flex items-center justify-center">
					<Text className="text-ui-fg-subtle">Lädt...</Text>
				</div>
			</Container>
		);
	}

	if (error) {
		return (
			<Container className="py-8">
				<div className="flex flex-col items-center justify-center">
					<Text className="text-ui-fg-error mb-2">{error}</Text>
					<Button variant="secondary" onClick={fetchOffers}>
						Erneut versuchen
					</Button>
				</div>
			</Container>
		);
	}

	return (
		<Container className="divide-y p-0 h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
				<div className="flex items-center gap-x-2">
					<FileText className="text-ui-fg-subtle" />
					<h1 className="text-lg font-semibold">Angebote</h1>
				</div>
				<Button size="small" variant="secondary" onClick={handleCreateOffer}>
					<Plus />
					Angebot erstellen
				</Button>
			</div>

			{/* Statistics Cards - Compact and Interactive */}
			<div className="px-6 py-3 border-b bg-ui-bg-subtle">
				<div className="flex items-center gap-2 flex-wrap">
					{/* Total - Not clickable */}
					<button
						className={`px-3 py-2 rounded-md text-left transition-colors ${
							statusFilter === 'all'
								? 'bg-ui-bg-base border border-ui-border-interactive'
								: 'bg-ui-bg-base hover:bg-ui-bg-base-hover'
						}`}
						onClick={() => setStatusFilter('all')}
					>
						<Text className="text-xs text-ui-fg-subtle">Gesamt</Text>
						<Text className="text-sm font-semibold block">{stats.total}</Text>
					</button>

					{/* Draft */}
					<button
						className={`px-3 py-2 rounded-md text-left transition-colors ${
							statusFilter === 'draft'
								? 'bg-ui-bg-base border border-ui-border-interactive'
								: 'bg-ui-bg-base hover:bg-ui-bg-base-hover'
						}`}
						onClick={() => setStatusFilter('draft')}
					>
						<Text className="text-xs text-ui-fg-subtle">Entwürfe</Text>
						<div className="flex items-baseline gap-1">
							<Text className="text-sm font-semibold">{stats.draft}</Text>
							{stats.draftValue !== undefined && stats.draftValue > 0 && (
								<Text className="text-xs text-ui-fg-muted">
									({new Intl.NumberFormat('de-DE', {
										style: 'currency',
										currency: 'EUR',
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									}).format((stats.draftValue || 0) / 100)})
								</Text>
							)}
						</div>
					</button>

					{/* Active */}
					<button
						className={`px-3 py-2 rounded-md text-left transition-colors ${
							statusFilter === 'active'
								? 'bg-ui-bg-base border border-ui-border-interactive'
								: 'bg-ui-bg-base hover:bg-ui-bg-base-hover'
						}`}
						onClick={() => setStatusFilter('active')}
					>
						<Text className="text-xs text-ui-fg-subtle">Aktiv</Text>
						<div className="flex items-baseline gap-1">
							<Text className="text-sm font-semibold">{stats.active}</Text>
							{stats.activeValue !== undefined && stats.activeValue > 0 && (
								<Text className="text-xs text-ui-fg-muted">
									({new Intl.NumberFormat('de-DE', {
										style: 'currency',
										currency: 'EUR',
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									}).format((stats.activeValue || 0) / 100)})
								</Text>
							)}
						</div>
					</button>

					{/* Accepted */}
					<button
						className={`px-3 py-2 rounded-md text-left transition-colors ${
							statusFilter === 'accepted'
								? 'bg-ui-bg-base border border-ui-border-interactive'
								: 'bg-ui-bg-base hover:bg-ui-bg-base-hover'
						}`}
						onClick={() => setStatusFilter('accepted')}
					>
						<Text className="text-xs text-ui-fg-subtle">Angenommen</Text>
						<div className="flex items-baseline gap-1">
							<Text className="text-sm font-semibold">{stats.accepted}</Text>
							{stats.acceptedValue !== undefined && stats.acceptedValue > 0 && (
								<Text className="text-xs text-ui-fg-muted">
									({new Intl.NumberFormat('de-DE', {
										style: 'currency',
										currency: 'EUR',
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									}).format((stats.acceptedValue || 0) / 100)})
								</Text>
							)}
						</div>
					</button>

					{/* Completed */}
					<button
						className={`px-3 py-2 rounded-md text-left transition-colors ${
							statusFilter === 'completed'
								? 'bg-ui-bg-base border border-ui-border-interactive'
								: 'bg-ui-bg-base hover:bg-ui-bg-base-hover'
						}`}
						onClick={() => setStatusFilter('completed')}
					>
						<Text className="text-xs text-ui-fg-subtle">Abgeschlossen</Text>
						<div className="flex items-baseline gap-1">
							<Text className="text-sm font-semibold">{stats.completed}</Text>
							{stats.completedValue !== undefined && stats.completedValue > 0 && (
								<Text className="text-xs text-ui-fg-muted">
									({new Intl.NumberFormat('de-DE', {
										style: 'currency',
										currency: 'EUR',
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									}).format((stats.completedValue || 0) / 100)})
								</Text>
							)}
						</div>
					</button>

					{/* Cancelled */}
					<button
						className={`px-3 py-2 rounded-md text-left transition-colors ${
							statusFilter === 'cancelled'
								? 'bg-ui-bg-base border border-ui-border-interactive'
								: 'bg-ui-bg-base hover:bg-ui-bg-base-hover'
						}`}
						onClick={() => setStatusFilter('cancelled')}
					>
						<Text className="text-xs text-ui-fg-subtle">Storniert</Text>
						<div className="flex items-baseline gap-1">
							<Text className="text-sm font-semibold">{stats.cancelled}</Text>
							{stats.cancelledValue !== undefined && stats.cancelledValue > 0 && (
								<Text className="text-xs text-ui-fg-muted">
									({new Intl.NumberFormat('de-DE', {
										style: 'currency',
										currency: 'EUR',
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									}).format((stats.cancelledValue || 0) / 100)})
								</Text>
							)}
						</div>
					</button>

					{/* Total Value - Not clickable, always visible */}
					<div className="ml-auto px-3 py-2 rounded-md bg-ui-bg-base">
						<Text className="text-xs text-ui-fg-subtle">Gesamtwert</Text>
						<Text className="text-sm font-semibold">
							{new Intl.NumberFormat('de-DE', {
								style: 'currency',
								currency: 'EUR',
							}).format(stats.totalValue / 100)}
						</Text>
					</div>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="px-6 py-4 border-b bg-ui-bg-subtle">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<Input
								type="text"
								placeholder="Suche..."
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
								className="w-64"
							/>
							<Button variant="secondary" size="small">
								<MagnifyingGlass className="w-4 h-4" />
							</Button>
						</div>
						<select
							value={statusFilter}
							onChange={e => setStatusFilter(e.target.value)}
							className="px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-field text-ui-fg-base focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
						>
							<option value="all">Alle Status</option>
							<option value="draft">Entwurf</option>
							<option value="active">Aktiv</option>
							<option value="accepted">Angenommen</option>
							<option value="completed">Abgeschlossen</option>
							<option value="cancelled">Storniert</option>
						</select>
					</div>
					<div className="flex items-center gap-2">
						<Text size="small" className="text-ui-fg-muted">
							{filteredOffers.length} Angebote
						</Text>
					</div>
				</div>

				{/* Search Results Info */}
				{searchTerm && (
					<div className="mt-2">
						<Text className="text-xs text-ui-fg-subtle">
							{filteredOffers.length === 0 ? (
								<span>Keine Ergebnisse für "{searchTerm}"</span>
							) : filteredOffers.length === 1 ? (
								<span>1 Ergebnis für "{searchTerm}"</span>
							) : (
								<span>
									{filteredOffers.length} Ergebnisse für "{searchTerm}"
								</span>
							)}
							{filteredOffers.length !== offers.length && (
								<span className="ml-2 text-ui-fg-muted">
									(von {offers.length} gesamt)
								</span>
							)}
						</Text>
					</div>
				)}
			</div>

			{/* Table */}
			<div className="flex-1 overflow-hidden">
				<div className="h-full overflow-auto px-6 py-4">
					{filteredOffers.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<FileText className="h-12 w-12 text-ui-fg-muted mb-4" />
							<Text className="text-ui-fg-subtle mb-2">
								{searchTerm || statusFilter !== 'all'
									? 'Keine Angebote entsprechen Ihren Filtern'
									: 'Keine Angebote gefunden'}
							</Text>
							<Text className="text-ui-fg-muted text-sm">
								Erstellen Sie Ihr erstes Angebot
							</Text>
						</div>
					) : (
						<OfferTable
							offers={filteredOffers}
							onEdit={handleEditOffer}
							onDelete={handleDeleteOffer}
							onView={handleViewOffer}
							isLoading={loading}
							isFetching={false}
							onSort={handleSort}
							onFilter={handleColumnFilter}
							sortConfig={sortConfig}
							filters={columnFilters}
						/>
					)}
				</div>
			</div>
		</Container>
	);
};

// Route configuration to make it appear in admin navigation
export const config = defineRouteConfig({
	label: 'Angebote',
	icon: FileText,
});

export default OffersPage;
