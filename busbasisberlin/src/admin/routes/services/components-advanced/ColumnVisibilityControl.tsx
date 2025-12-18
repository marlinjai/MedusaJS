/**
 * ColumnVisibilityControl.tsx
 * Notion-style column visibility control for toggling table columns
 */
import { Button, Checkbox, Text } from '@medusajs/ui';
import { Eye } from 'lucide-react';
import { useState } from 'react';

type Column = {
	key: string;
	label: string;
	width: number;
	resizable: boolean;
	draggable: boolean;
};

type ColumnVisibilityControlProps = {
	columns: Column[];
	visibleColumns: Set<string>;
	onToggle: (key: string) => void;
	onShowAll: () => void;
	onHideAll: () => void;
};

export default function ColumnVisibilityControl({
	columns,
	visibleColumns,
	onToggle,
	onShowAll,
	onHideAll,
}: ColumnVisibilityControlProps) {
	const [isOpen, setIsOpen] = useState(false);

	// Columns that shouldn't be hideable (critical columns)
	const nonHideableColumns = ['select', 'title', 'actions'];

	return (
		<div className="relative">
			<Button
				variant="secondary"
				size="small"
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2"
			>
				<Eye className="w-4 h-4" />
				<Text size="small">Eigenschaften</Text>
			</Button>

			{isOpen && (
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 z-10"
						onClick={() => setIsOpen(false)}
					/>

					{/* Dropdown Panel */}
					<div className="absolute right-0 mt-2 w-64 bg-ui-bg-base border border-ui-border-base rounded-lg shadow-elevation-modal z-20">
						{/* Header */}
						<div className="px-4 py-3 border-b border-ui-border-base">
							<Text size="small" weight="plus">
								Eigenschaften Sichtbarkeit
							</Text>
						</div>

						{/* Column List */}
						<div className="max-h-96 overflow-y-auto py-2">
							{columns
								.filter(col => col.label) // Filter out columns without labels (like select)
								.map(col => {
									const isNonHideable = nonHideableColumns.includes(col.key);
									const isVisible = visibleColumns.has(col.key);

									return (
										<div
											key={col.key}
											className={`flex items-center gap-3 px-4 py-2 hover:bg-ui-bg-subtle ${
												isNonHideable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
											}`}
											onClick={() => {
												if (!isNonHideable) {
													onToggle(col.key);
												}
											}}
										>
											<Checkbox
												checked={isVisible}
												disabled={isNonHideable}
												onCheckedChange={() => {
													if (!isNonHideable) {
														onToggle(col.key);
													}
												}}
											/>
											<Text size="small">{col.label}</Text>
										</div>
									);
								})}
						</div>

						{/* Footer Actions */}
						<div className="flex items-center gap-2 px-4 py-3 border-t border-ui-border-base">
							<Button
								variant="secondary"
								size="small"
								onClick={() => {
									onShowAll();
									setIsOpen(false);
								}}
								className="flex-1"
							>
								Alle anzeigen
							</Button>
							<Button
								variant="secondary"
								size="small"
								onClick={() => {
									onHideAll();
									setIsOpen(false);
								}}
								className="flex-1"
							>
								Minimieren
							</Button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}





