// busbasisberlin/src/admin/routes/products/by-category/components/InlineTagsEditor.tsx
// Inline tags editor modal - Notion-style tag selector

import { Button, Checkbox, Input, Text, toast } from '@medusajs/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, MoreVertical, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Tag = {
	id: string;
	value: string;
};

type Product = {
	id: string;
	title: string;
	tags?: Tag[];
};

type InlineTagsEditorProps = {
	product: Product;
	onClose: () => void;
	onUpdate: (productId: string, updates: any) => Promise<void>;
	anchorEl?: HTMLElement;
};

export default function InlineTagsEditor({
	product,
	onClose,
	onUpdate,
	anchorEl,
}: InlineTagsEditorProps) {
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
		new Set(product.tags?.map(t => t.id) || []),
	);
	const [editingTagId, setEditingTagId] = useState<string | null>(null);
	const [editingValue, setEditingValue] = useState('');
	const [menuOpenTagId, setMenuOpenTagId] = useState<string | null>(null);
	const [draggedTagId, setDraggedTagId] = useState<string | null>(null);
	const [dragOverTagId, setDragOverTagId] = useState<string | null>(null);
	const modalRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Fetch all available tags
	const { data: allTags = [], isLoading } = useQuery({
		queryKey: ['admin-product-tags'],
		queryFn: async () => {
			const res = await fetch('/admin/product-tags?limit=1000', {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch tags');
			const data = await res.json();
			return (data?.product_tags || []) as Tag[];
		},
	});

	// Filter tags based on search
	const filteredTags = allTags.filter(tag =>
		tag.value.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// Split into selected and unselected
	const selectedTags = filteredTags.filter(tag => selectedTagIds.has(tag.id));
	const unselectedTags = filteredTags.filter(
		tag => !selectedTagIds.has(tag.id),
	);

	// Position modal near anchor element
	useEffect(() => {
		if (modalRef.current && anchorEl) {
			const rect = anchorEl.getBoundingClientRect();
			const modal = modalRef.current;

			// Position below the cell by default
			let top = rect.bottom + window.scrollY + 4;
			let left = rect.left + window.scrollX;

			// Check if modal would go off-screen
			const modalHeight = 400; // max-height
			const modalWidth = 320;

			if (top + modalHeight > window.innerHeight + window.scrollY) {
				// Position above if not enough space below
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

	// Toggle tag selection
	const toggleTag = async (tagId: string) => {
		const newSelectedIds = new Set(selectedTagIds);
		if (newSelectedIds.has(tagId)) {
			newSelectedIds.delete(tagId);
		} else {
			newSelectedIds.add(tagId);
		}
		setSelectedTagIds(newSelectedIds);

		// Update product tags immediately
		const selectedTagValues = Array.from(newSelectedIds)
			.map(id => allTags.find(t => t.id === id)?.value)
			.filter(Boolean);

		try {
			await onUpdate(product.id, { tags: selectedTagValues });
			queryClient.invalidateQueries({
				queryKey: ['admin-products-by-category'],
			});
		} catch (error) {
			toast.error('Error', {
				description: 'Failed to update product tags',
			});
		}
	};

	// Create new tag
	const createTag = async (value: string) => {
		if (!value.trim()) return;

		try {
			const res = await fetch('/admin/product-tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ value: value.trim() }),
			});

			if (!res.ok) throw new Error('Failed to create tag');

			const { product_tag } = await res.json();

			// Refresh tags list
			queryClient.invalidateQueries({ queryKey: ['admin-product-tags'] });

			// Add to selected
			setSelectedTagIds(new Set([...selectedTagIds, product_tag.id]));

			// Update product
			await onUpdate(product.id, {
				tags: [...(product.tags?.map(t => t.value) || []), value.trim()],
			});

			queryClient.invalidateQueries({
				queryKey: ['admin-products-by-category'],
			});

			setSearchQuery('');
			toast.success('Success', { description: 'Tag created and added' });
		} catch (error) {
			toast.error('Error', { description: 'Failed to create tag' });
		}
	};

	// Handle Enter key in search input
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && searchQuery.trim()) {
			// Check if tag already exists
			const exists = allTags.some(
				t => t.value.toLowerCase() === searchQuery.toLowerCase(),
			);
			if (!exists) {
				createTag(searchQuery);
			}
		}
	};

	// Rename tag
	const renameTag = async (tagId: string, newValue: string) => {
		if (!newValue.trim()) return;

		try {
			const res = await fetch(`/admin/product-tags/${tagId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ value: newValue.trim() }),
			});

			if (!res.ok) throw new Error('Failed to rename tag');

			queryClient.invalidateQueries({ queryKey: ['admin-product-tags'] });
			queryClient.invalidateQueries({
				queryKey: ['admin-products-by-category'],
			});

			setEditingTagId(null);
			toast.success('Success', { description: 'Tag renamed' });
		} catch (error) {
			toast.error('Error', { description: 'Failed to rename tag' });
		}
	};

	// Delete tag
	const deleteTag = async (tagId: string) => {
		if (!confirm('Delete this tag? It will be removed from all products.')) {
			return;
		}

		try {
			const res = await fetch(`/admin/product-tags/${tagId}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Failed to delete tag');

			queryClient.invalidateQueries({ queryKey: ['admin-product-tags'] });
			queryClient.invalidateQueries({
				queryKey: ['admin-products-by-category'],
			});

			setMenuOpenTagId(null);
			toast.success('Success', { description: 'Tag deleted' });
		} catch (error) {
			toast.error('Error', { description: 'Failed to delete tag' });
		}
	};

	// Drag and drop handlers
	const handleDragStart = (tagId: string) => {
		setDraggedTagId(tagId);
	};

	const handleDragOver = (e: React.DragEvent, tagId: string) => {
		e.preventDefault();
		setDragOverTagId(tagId);
	};

	const handleDrop = async (e: React.DragEvent, targetTagId: string) => {
		e.preventDefault();
		if (!draggedTagId || draggedTagId === targetTagId) {
			setDraggedTagId(null);
			setDragOverTagId(null);
			return;
		}

		// Reorder tags in the selected list
		const currentTags = Array.from(selectedTagIds);
		const draggedIndex = currentTags.indexOf(draggedTagId);
		const targetIndex = currentTags.indexOf(targetTagId);

		if (draggedIndex !== -1 && targetIndex !== -1) {
			const newOrder = [...currentTags];
			newOrder.splice(draggedIndex, 1);
			newOrder.splice(targetIndex, 0, draggedTagId);

			setSelectedTagIds(new Set(newOrder));

			// Update product with new tag order
			const orderedTagValues = newOrder
				.map(id => allTags.find(t => t.id === id)?.value)
				.filter(Boolean);

			try {
				await onUpdate(product.id, { tags: orderedTagValues });
				queryClient.invalidateQueries({
					queryKey: ['admin-products-by-category'],
				});
			} catch (error) {
				toast.error('Error', { description: 'Failed to reorder tags' });
			}
		}

		setDraggedTagId(null);
		setDragOverTagId(null);
	};

	const handleDragEnd = () => {
		setDraggedTagId(null);
		setDragOverTagId(null);
	};

	return (
		<div
			ref={modalRef}
			className="fixed z-50 w-80 bg-ui-bg-base border border-ui-border-base rounded-lg shadow-xl"
			style={{ maxHeight: '400px' }}
		>
			{/* Search/Create Input */}
			<div className="p-3 border-b border-ui-border-base">
				<Input
					ref={inputRef}
					type="text"
					placeholder="Search or create tag..."
					value={searchQuery}
					onChange={e => setSearchQuery(e.target.value)}
					onKeyDown={handleKeyDown}
					size="small"
				/>
				{searchQuery.trim() &&
					!allTags.some(
						t => t.value.toLowerCase() === searchQuery.toLowerCase(),
					) && (
						<Button
							variant="transparent"
							size="small"
							onClick={() => createTag(searchQuery)}
							className="mt-2 w-full justify-start text-ui-fg-subtle hover:text-ui-fg-base"
						>
							<Plus className="w-4 h-4 mr-2" />
							Create "{searchQuery}"
						</Button>
					)}
			</div>

			{/* Tags List */}
			<div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
				{isLoading ? (
					<div className="p-4 text-center">
						<Text size="small" className="text-ui-fg-subtle">
							Loading tags...
						</Text>
					</div>
				) : (
					<div className="p-2">
						{/* Selected tags first */}
						{selectedTags.length > 0 && (
							<div className="mb-2">
								{selectedTags.map(tag => (
									<TagItem
										key={tag.id}
										tag={tag}
										isSelected={true}
										onToggle={toggleTag}
										isEditing={editingTagId === tag.id}
										editingValue={editingValue}
										onStartEdit={() => {
											setEditingTagId(tag.id);
											setEditingValue(tag.value);
										}}
										onSaveEdit={() => renameTag(tag.id, editingValue)}
										onCancelEdit={() => setEditingTagId(null)}
										onEditValueChange={setEditingValue}
										onDelete={deleteTag}
										menuOpen={menuOpenTagId === tag.id}
										onMenuToggle={() =>
											setMenuOpenTagId(menuOpenTagId === tag.id ? null : tag.id)
										}
										onDragStart={() => handleDragStart(tag.id)}
										onDragOver={e => handleDragOver(e, tag.id)}
										onDrop={e => handleDrop(e, tag.id)}
										onDragEnd={handleDragEnd}
										isDragging={draggedTagId === tag.id}
										isDragOver={dragOverTagId === tag.id}
									/>
								))}
							</div>
						)}

						{/* Unselected tags */}
						{unselectedTags.length > 0 && (
							<div>
								{unselectedTags.map(tag => (
									<TagItem
										key={tag.id}
										tag={tag}
										isSelected={false}
										onToggle={toggleTag}
										isEditing={editingTagId === tag.id}
										editingValue={editingValue}
										onStartEdit={() => {
											setEditingTagId(tag.id);
											setEditingValue(tag.value);
										}}
										onSaveEdit={() => renameTag(tag.id, editingValue)}
										onCancelEdit={() => setEditingTagId(null)}
										onEditValueChange={setEditingValue}
										onDelete={deleteTag}
										menuOpen={menuOpenTagId === tag.id}
										onMenuToggle={() =>
											setMenuOpenTagId(menuOpenTagId === tag.id ? null : tag.id)
										}
									/>
								))}
							</div>
						)}

						{filteredTags.length === 0 && !searchQuery && (
							<div className="p-4 text-center">
								<Text size="small" className="text-ui-fg-subtle">
									No tags yet. Create one above.
								</Text>
							</div>
						)}

						{filteredTags.length === 0 && searchQuery && (
							<div className="p-4 text-center">
								<Text size="small" className="text-ui-fg-subtle">
									No matching tags
								</Text>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

// Tag Item Component
type TagItemProps = {
	tag: Tag;
	isSelected: boolean;
	onToggle: (id: string) => void;
	isEditing: boolean;
	editingValue: string;
	onStartEdit: () => void;
	onSaveEdit: () => void;
	onCancelEdit: () => void;
	onEditValueChange: (value: string) => void;
	onDelete: (id: string) => void;
	menuOpen: boolean;
	onMenuToggle: () => void;
	onDragStart?: () => void;
	onDragOver?: (e: React.DragEvent) => void;
	onDrop?: (e: React.DragEvent) => void;
	onDragEnd?: () => void;
	isDragging?: boolean;
	isDragOver?: boolean;
};

function TagItem({
	tag,
	isSelected,
	onToggle,
	isEditing,
	editingValue,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
	onEditValueChange,
	onDelete,
	menuOpen,
	onMenuToggle,
	onDragStart,
	onDragOver,
	onDrop,
	onDragEnd,
	isDragging,
	isDragOver,
}: TagItemProps) {
	const editInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing) {
			editInputRef.current?.focus();
			editInputRef.current?.select();
		}
	}, [isEditing]);

	if (isEditing) {
		return (
			<div className="flex items-center gap-2 py-1.5 px-2 hover:bg-ui-bg-subtle rounded">
				<Input
					ref={editInputRef}
					type="text"
					value={editingValue}
					onChange={e => onEditValueChange(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Enter') {
							onSaveEdit();
						} else if (e.key === 'Escape') {
							onCancelEdit();
						}
					}}
					onBlur={onSaveEdit}
					size="small"
					className="flex-1"
				/>
			</div>
		);
	}

	return (
		<div
			draggable={isSelected}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDrop={onDrop}
			onDragEnd={onDragEnd}
			className={`flex items-center gap-2 py-1.5 px-2 hover:bg-ui-bg-subtle rounded group ${
				isDragging ? 'opacity-50' : ''
			} ${isDragOver ? 'border-t-2 border-ui-border-interactive' : ''}`}
		>
			<GripVertical
				className={`w-4 h-4 text-ui-fg-subtle ${
					isSelected
						? 'cursor-grab opacity-0 group-hover:opacity-100'
						: 'invisible'
				}`}
			/>
			<Checkbox checked={isSelected} onCheckedChange={() => onToggle(tag.id)} />
			<Text
				size="small"
				className="flex-1 cursor-pointer"
				onClick={() => onToggle(tag.id)}
			>
				{tag.value}
			</Text>
			<div className="relative">
				<Button
					variant="transparent"
					size="small"
					onClick={onMenuToggle}
					className="opacity-0 group-hover:opacity-100 p-1"
				>
					<MoreVertical className="w-4 h-4" />
				</Button>
				{menuOpen && (
					<div className="absolute right-0 top-full mt-1 bg-ui-bg-base border border-ui-border-base rounded-lg shadow-lg z-10 min-w-[120px]">
						<button
							onClick={() => {
								onStartEdit();
								onMenuToggle();
							}}
							className="w-full text-left px-3 py-2 text-sm hover:bg-ui-bg-subtle"
						>
							Rename
						</button>
						<button
							onClick={() => {
								onDelete(tag.id);
								onMenuToggle();
							}}
							className="w-full text-left px-3 py-2 text-sm hover:bg-ui-bg-subtle text-ui-fg-error"
						>
							Delete
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
