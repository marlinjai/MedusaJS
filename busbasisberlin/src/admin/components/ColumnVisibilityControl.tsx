/**
 * ColumnVisibilityControl.tsx
 * Shared column visibility control component for table columns
 * Supports both simple and advanced styling variants
 */
import { Button, Checkbox, Text } from '@medusajs/ui';
import { Eye } from 'lucide-react';
import { useState } from 'react';

type Column = {
	key: string;
	label: string;
	width: number;
	resizable?: boolean;
	draggable?: boolean;
};

type ColumnVisibilityControlProps = {
	columns: Column[];
	visibleColumns: Set<string>;
	onToggle: (key: string) => void;
	onShowAll: () => void;
	onHideAll: () => void;
	// Configuration options
	nonHideableColumns?: string[];
	buttonText?: string;
	headerText?: string;
	variant?: 'simple' | 'advanced'; // simple = left-aligned, advanced = right-aligned with better styling
};

export default function ColumnVisibilityControl({
	columns,
	visibleColumns,
	onToggle,
	onShowAll,
	onHideAll,
	nonHideableColumns = ['actions'],
	buttonText = 'Spalten',
	headerText = 'Eigenschaften Sichtbarkeit',
	variant = 'advanced',
}: ColumnVisibilityControlProps) {
	const [isOpen, setIsOpen] = useState(false);

	// Get hideable columns
	const hideableColumns = columns.filter(col => col.label); // Filter out columns without labels

	// Simple variant (used by suppliers, manual-customers)
	if (variant === 'simple') {
		return (
			<div className="relative">
				<Button
					variant="secondary"
					size="small"
					onClick={() => setIsOpen(!isOpen)}
					className="flex items-center gap-2"
				>
					<Eye className="w-4 h-4" />
					<Text size="small">{buttonText}</Text>
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
								{hideableColumns
									.filter(c => !nonHideableColumns.includes(c.key))
									.map(column => (
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

	// Advanced variant (used by products, services)
	return (
		<div className="relative">
			<Button
				variant="secondary"
				size="small"
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2"
			>
				<Eye className="w-4 h-4" />
				<Text size="small">{buttonText}</Text>
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
								{headerText}
							</Text>
						</div>

						{/* Column List */}
						<div className="max-h-96 overflow-y-auto py-2">
							{hideableColumns.map(col => {
								const isNonHideable = nonHideableColumns.includes(col.key);
								const isVisible = visibleColumns.has(col.key);

								return (
									<div
										key={col.key}
										className={`flex items-center gap-3 px-4 py-2 hover:bg-ui-bg-subtle ${
											isNonHideable
												? 'opacity-50 cursor-not-allowed'
												: 'cursor-pointer'
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

