// busbasisberlin/src/admin/routes/products/by-category/components/ProductEditorModal.tsx
// Product editor modal with Details/Organisieren/Varianten tabs

import { Button, FocusModal, Heading, Text } from '@medusajs/ui';
import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import ProductDetailsTab from './ProductDetailsTab';
import ProductOrganizeTab from './ProductOrganizeTab';
import ProductVariantsTab from './ProductVariantsTab';

export type ProductOption = {
	title: string;
	values: string[];
};

export type Variant = {
	id?: string;
	title: string;
	sku?: string;
	manage_inventory?: boolean;
	allow_backorder?: boolean;
	with_inventory_set?: boolean;
	price_eur?: number;
	price_europe?: number;
	enabled?: boolean;
	option_values?: string[];
	images?: Array<{ id?: string; url: string }>;
};

type Product = {
	id?: string;
	title: string;
	subtitle?: string;
	handle: string;
	status: 'published' | 'draft';
	description?: string;
	discountable?: boolean;
	type_id?: string;
	collection_id?: string;
	category_ids?: string[];
	tags?: string[];
	shipping_profile_id?: string;
	sales_channel_ids?: string[];
	variants?: Variant[];
	has_variants?: boolean;
	options?: ProductOption[];
	images?: Array<{ id?: string; url: string }>;
	thumbnail?: string;
};

interface ProductEditorModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	product?: Product | null;
	onSave: (product: Product) => Promise<void>;
}

const ProductEditorModal = ({
	open,
	onOpenChange,
	product,
	onSave,
}: ProductEditorModalProps) => {
	const [activeTab, setActiveTab] = useState<'details' | 'organize' | 'variants'>(
		'details',
	);
	const [isSaving, setIsSaving] = useState(false);
	const [formData, setFormData] = useState<Partial<Product>>({
		title: '',
		handle: '',
		status: 'draft',
		discountable: true,
		category_ids: [],
		sales_channel_ids: [],
		variants: [],
		has_variants: false,
		options: [],
		images: [],
		thumbnail: undefined,
	});

	// Update formData when product prop changes
	useEffect(() => {
		if (product) {
			// Transform variant prices from Medusa format (prices array) to form format (flat fields)
			const transformedVariants = product.variants?.map((variant: any) => {
				// Find EUR and EUROPE prices from the prices array
				const eurPrice = variant.prices?.find(
					(p: any) => p?.currency_code?.toLowerCase() === 'eur'
				);
				const europePrice = variant.prices?.find(
					(p: any) => p?.currency_code?.toLowerCase() === 'europe'
				);

				// Debug logging to understand the price format
				if (eurPrice) {
					console.log('[ProductEditorModal] Price debug:', {
						sku: variant.sku,
						eurPrice,
						amount: eurPrice.amount,
						amountType: typeof eurPrice.amount,
						isLikelyCents: eurPrice.amount >= 100,
						calculatedPrice: eurPrice.amount / 100,
					});
				}

				// Smart price conversion: if amount is >= 100, it's likely in cents (Medusa standard)
				// If amount is < 100, it might already be in euros (incorrectly stored)
				const convertPrice = (price: any) => {
					if (!price) return 0;
					const amount = price.amount;
					// If amount >= 100, assume it's in cents and divide by 100
					// If amount < 100, assume it's already in euros (edge case for products under €1)
					// But we need to handle the case where 2.99 was stored directly
					return amount >= 100 ? amount / 100 : amount;
				};

				return {
					...variant,
					price_eur: convertPrice(eurPrice),
					price_europe: convertPrice(europePrice),
				};
			}) || [];

			setFormData({
				...product,
				// Map categories array to category_ids
				category_ids: product.categories?.map(c => c.id) || [],
				// Map sales_channels array to sales_channel_ids
				sales_channel_ids: product.sales_channels?.map(sc => sc.id) || [],
				// Map tags array to tag values (tags come as objects with id and value)
				tags: product.tags?.map((tag: any) =>
					typeof tag === 'string' ? tag : tag.value
				) || [],
				// Map type object to type_id
				type_id: product.type?.id || product.type_id,
				// Map shipping_profile object to shipping_profile_id
				shipping_profile_id: product.shipping_profile?.id || product.shipping_profile_id,
				// Use transformed variants with flat price fields
				variants: transformedVariants,
				// Preserve thumbnail from product
				thumbnail: product.thumbnail,
			});
			setActiveTab('details'); // Reset to details tab when product changes
		} else {
			// Reset to defaults for new product
			setFormData({
				title: '',
				handle: '',
				status: 'draft',
				discountable: true,
				category_ids: [],
				sales_channel_ids: [],
				variants: [],
				has_variants: false,
				options: [],
				images: [],
				thumbnail: undefined,
			});
		}
	}, [product]);

	const handleSave = async (asDraft = false) => {
		setIsSaving(true);
		try {
			const productToSave: Product = {
				...formData,
				status: asDraft ? 'draft' : 'published',
			} as Product;
			await onSave(productToSave);
			onOpenChange(false);
		} catch (error) {
			console.error('Error saving product:', error);
		} finally {
			setIsSaving(false);
		}
	};

	const handleNext = () => {
		if (activeTab === 'details') {
			setActiveTab('organize');
		} else if (activeTab === 'organize') {
			setActiveTab('variants');
		}
	};

	return (
		<FocusModal open={open} onOpenChange={onOpenChange}>
			<FocusModal.Content className="max-w-[95vw] w-full max-h-[95vh] h-full m-auto">
				<FocusModal.Header>
					<div className="flex items-center justify-between w-full">
						<Heading level="h1" className="text-2xl font-bold">
							{product ? 'Produkt bearbeiten' : 'Neues Produkt'}
						</Heading>
						{product?.id && (
							<Button
								variant="transparent"
								size="small"
								onClick={() => {
									window.open(`/app/products/${product.id}`, '_blank');
								}}
								className="flex items-center gap-2"
							>
								<ExternalLink className="w-4 h-4" />
								<Text size="small">Core Produktseite</Text>
							</Button>
						)}
					</div>
				</FocusModal.Header>

				{/* Tabs Navigation */}
				<div className="flex border-b border-ui-border-base px-6 flex-shrink-0">
					<button
						onClick={() => setActiveTab('details')}
						className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
							activeTab === 'details'
								? 'border-ui-fg-base text-ui-fg-base'
								: 'border-transparent text-ui-fg-subtle hover:text-ui-fg-base'
						}`}
					>
						Details
					</button>
					<button
						onClick={() => setActiveTab('organize')}
						className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
							activeTab === 'organize'
								? 'border-ui-fg-base text-ui-fg-base'
								: 'border-transparent text-ui-fg-subtle hover:text-ui-fg-base'
						}`}
					>
						Organisieren
					</button>
					<button
						onClick={() => setActiveTab('variants')}
						className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
							activeTab === 'variants'
								? 'border-ui-fg-base text-ui-fg-base'
								: 'border-transparent text-ui-fg-subtle hover:text-ui-fg-base'
						}`}
					>
						Varianten
					</button>
				</div>

				{/* Tab Content */}
				<FocusModal.Body className="overflow-y-auto">
					<div className="p-6">
						{activeTab === 'details' && (
							<ProductDetailsTab formData={formData} onChange={setFormData} />
						)}
						{activeTab === 'organize' && (
							<ProductOrganizeTab formData={formData} onChange={setFormData} />
						)}
						{activeTab === 'variants' && (
							<ProductVariantsTab formData={formData} onChange={setFormData} />
						)}
					</div>
				</FocusModal.Body>

				{/* Modal Footer */}
				<FocusModal.Footer>
					<div className="flex justify-end gap-3 w-full">
						<Button
							variant="secondary"
							onClick={() => onOpenChange(false)}
							disabled={isSaving}
						>
							Abbrechen
						</Button>
						<Button
							variant="secondary"
							onClick={() => handleSave(true)}
							disabled={isSaving}
						>
							Als Entwurf speichern
						</Button>
						{activeTab !== 'variants' ? (
							<Button onClick={handleNext} disabled={isSaving}>
								Weiter
							</Button>
						) : (
							<Button
								variant="primary"
								onClick={() => handleSave(false)}
								disabled={isSaving}
							>
								Veröffentlichen
							</Button>
						)}
					</div>
				</FocusModal.Footer>
			</FocusModal.Content>
		</FocusModal>
	);
};

export default ProductEditorModal;

