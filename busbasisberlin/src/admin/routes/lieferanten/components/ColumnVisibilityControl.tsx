/**
 * ColumnVisibilityControl.tsx
 * Column visibility toggle for Suppliers table
 */
import { Button, Checkbox, Text } from '@medusajs/ui';
import { Eye } from 'lucide-react';
import { useState } from 'react';

type Column = {
	key: string;
	label: string;
	width: number;
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
	const nonHideableColumns = ['company', 'actions'];

	// Get hideable columns
	const hideableColumns = columns.filter(c => !nonHideableColumns.includes(c.key));

	return (
		<div className="relative">
			<Button
				variant="secondary"
				size="small"
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2"
			>
				<Eye className="w-4 h-4" />
				<Text size="small">Spalten</Text>
			</Button>

			{isOpen && (
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
					/>

				{/* Dropdown */}
				<div className="absolute left-0 top-full mt-2 z-50 bg-ui-bg-base border border-ui-border-base rounded-lg shadow-lg min-w-[220px] py-2">
						{/* Header with actions */}
						<div className="px-3 py-2 border-b border-ui-border-base">
							<div className="flex items-center justify-between gap-2">
								<Button
									variant="transparent"
									size="small"
									onClick={() => {
										onShowAll();
									}}
									className="text-xs"
								>
									Alle anzeigen
								</Button>
								<Button
									variant="transparent"
									size="small"
									onClick={() => {
										onHideAll();
									}}
									className="text-xs"
								>
									Alle ausblenden
								</Button>
							</div>
						</div>

						{/* Column list */}
						<div className="max-h-[400px] overflow-y-auto">
							{hideableColumns.map(column => (
								<div
									key={column.key}
									className="px-3 py-2 hover:bg-ui-bg-subtle cursor-pointer flex items-center gap-2"
									onClick={() => onToggle(column.key)}
								>
									<Checkbox
										checked={visibleColumns.has(column.key)}
										onCheckedChange={() => onToggle(column.key)}
									/>
									<Text size="small">{column.label}</Text>
								</div>
							))}
						</div>

						{/* Non-hideable columns info */}
						<div className="px-3 py-2 border-t border-ui-border-base">
							<Text size="xsmall" className="text-ui-fg-subtle">
								{nonHideableColumns.length} Spalten sind immer sichtbar
							</Text>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

