// busbasisberlin/src/admin/routes/products/by-category/components/InlineCollectionSelector.tsx
// Inline collection selector modal - similar to tags editor

import { Button, Input, Text, toast } from '@medusajs/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Collection = {
	id: string;
	title: string;
};

type Product = {
	id: string;
	title: string;
	collection?: Collection;
};

type InlineCollectionSelectorProps = {
	product: Product;
	onClose: () => void;
	onUpdate: (productId: string, updates: any) => Promise<void>;
	anchorEl?: HTMLElement;
};

export default function InlineCollectionSelector({
	product,
	onClose,
	onUpdate,
	anchorEl,
}: InlineCollectionSelectorProps) {
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCollectionId, setSelectedCollectionId] = useState<
		string | null
	>(product.collection?.id || null);
	const modalRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Fetch all available collections
	const { data: allCollections = [], isLoading } = useQuery({
		queryKey: ['admin-collections'],
		queryFn: async () => {
			const res = await fetch('/admin/collections?limit=1000', {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch collections');
			const data = await res.json();
			return (data?.collections || []) as Collection[];
		},
	});

	// Filter collections based on search
	const filteredCollections = allCollections.filter(collection =>
		collection.title.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// Position modal near anchor element
	useEffect(() => {
		if (modalRef.current && anchorEl) {
			const rect = anchorEl.getBoundingClientRect();
			const modal = modalRef.current;

			let top = rect.bottom + window.scrollY + 4;
			let left = rect.left + window.scrollX;

			const modalHeight = 300;
			const modalWidth = 320;

			if (top + modalHeight > window.innerHeight + window.scrollY) {
				top = rect.top + window.scrollY - modalHeight - 4;
			}

			if (left + modalWidth > window.innerWidth) {
				left = window.innerWidth - modalWidth - 16;
			}

			modal.style.top = `${top}px`;
			modal.style.left = `${left}px`;
		}
	}, [anchorEl]);

	// Auto-focus search input
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// Close on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
				onClose();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [onClose]);

	// Close on Escape
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [onClose]);

	// Select collection
	const selectCollection = async (collectionId: string | null) => {
		setSelectedCollectionId(collectionId);

		try {
			await onUpdate(product.id, { collection_id: collectionId });
			queryClient.invalidateQueries({
				queryKey: ['admin-products-by-category'],
			});
			toast.success('Success', {
				description: collectionId
					? 'Collection updated'
					: 'Collection removed',
			});
		} catch (error) {
			toast.error('Error', {
				description: 'Failed to update collection',
			});
		}
	};

	return (
		<div
			ref={modalRef}
			className="fixed z-50 w-80 bg-ui-bg-base border border-ui-border-base rounded-lg shadow-xl"
			style={{ maxHeight: '300px' }}
		>
			{/* Search Input */}
			<div className="p-3 border-b border-ui-border-base">
				<Input
					ref={inputRef}
					type="text"
					placeholder="Search collections..."
					value={searchQuery}
					onChange={e => setSearchQuery(e.target.value)}
					size="small"
				/>
			</div>

			{/* Collections List */}
			<div className="overflow-y-auto" style={{ maxHeight: '230px' }}>
				{isLoading ? (
					<div className="p-4 text-center">
						<Text size="small" className="text-ui-fg-subtle">
							Loading collections...
						</Text>
					</div>
				) : (
					<div className="p-2">
						{/* Option to remove collection */}
						<button
							onClick={() => selectCollection(null)}
							className="w-full flex items-center gap-2 py-2 px-3 hover:bg-ui-bg-subtle rounded text-left"
						>
							<div className="w-4 h-4 flex items-center justify-center">
								{selectedCollectionId === null && (
									<Check className="w-4 h-4 text-ui-fg-interactive" />
								)}
							</div>
							<Text size="small" className="text-ui-fg-subtle">
								No collection
							</Text>
						</button>

						{/* Collections list */}
						{filteredCollections.map(collection => (
							<button
								key={collection.id}
								onClick={() => selectCollection(collection.id)}
								className="w-full flex items-center gap-2 py-2 px-3 hover:bg-ui-bg-subtle rounded text-left"
							>
								<div className="w-4 h-4 flex items-center justify-center">
									{selectedCollectionId === collection.id && (
										<Check className="w-4 h-4 text-ui-fg-interactive" />
									)}
								</div>
								<Text size="small" className="flex-1">
									{collection.title}
								</Text>
							</button>
						))}

						{filteredCollections.length === 0 && !searchQuery && (
							<div className="p-4 text-center">
								<Text size="small" className="text-ui-fg-subtle">
									No collections available
								</Text>
							</div>
						)}

						{filteredCollections.length === 0 && searchQuery && (
							<div className="p-4 text-center">
								<Text size="small" className="text-ui-fg-subtle">
									No matching collections
								</Text>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

