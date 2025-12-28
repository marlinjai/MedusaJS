// busbasisberlin/src/admin/components/MobileControlBar.tsx
// Control bar for mobile with Filter, Sort, and Columns buttons

import { Button } from '@medusajs/ui';
import { Filter, ArrowUpDown, Columns3, FolderTree } from 'lucide-react';

type MobileControlBarProps = {
	onFilterClick: () => void;
	onSortClick: () => void;
	onColumnsClick: () => void;
	onCategoryClick?: () => void;
	filterCount?: number;
	activeFiltersCount?: number;
	sortLabel?: string;
};

export function MobileControlBar({
	onFilterClick,
	onSortClick,
	onColumnsClick,
	onCategoryClick,
	filterCount,
	activeFiltersCount,
	sortLabel,
}: MobileControlBarProps) {
	const displayCount = activeFiltersCount ?? filterCount ?? 0;

	return (
		<div className="flex gap-2 p-2 bg-ui-bg-base sticky top-0 z-[45] border-b border-ui-border-base md:hidden shadow-sm">
			{onCategoryClick && (
				<Button
					size="small"
					variant="secondary"
					onClick={onCategoryClick}
					className="flex-1 text-xs"
				>
					<FolderTree className="w-4 h-4 mr-1" />
					Kategorien
				</Button>
			)}
			<Button
				size="small"
				variant="secondary"
				onClick={onFilterClick}
				className="flex-1 text-xs"
			>
				<Filter className="w-4 h-4 mr-1" />
				Filter{displayCount > 0 && ` (${displayCount})`}
			</Button>
			<Button
				size="small"
				variant="secondary"
				onClick={onSortClick}
				className="flex-1 text-xs"
			>
				<ArrowUpDown className="w-4 h-4 mr-1" />
				{sortLabel || 'Sort'}
			</Button>
			<Button
				size="small"
				variant="secondary"
				onClick={onColumnsClick}
				className="flex-1 text-xs"
			>
				<Columns3 className="w-4 h-4 mr-1" />
				Columns
			</Button>
		</div>
	);
}
