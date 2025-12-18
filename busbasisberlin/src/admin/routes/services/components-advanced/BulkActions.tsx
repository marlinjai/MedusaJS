/**
 * BulkActions.tsx
 * Bulk action toolbar for services (status updates, price adjustments)
 */
import { Button, Select, Text } from '@medusajs/ui';
import { DollarSign, Edit, X } from 'lucide-react';

type BulkActionsProps = {
	selectedCount: number;
	onClearSelection: () => void;
	onBulkStatusUpdate: (newStatus: 'active' | 'inactive') => void;
	onOpenPriceAdjustment: () => void;
};

export default function BulkActions({
	selectedCount,
	onClearSelection,
	onBulkStatusUpdate,
	onOpenPriceAdjustment,
}: BulkActionsProps) {
	if (selectedCount === 0) return null;

	return (
		<div className="bg-ui-bg-subtle-hover border border-ui-border-strong rounded-lg p-4 mb-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Text size="small" weight="plus" className="text-ui-fg-base">
						{selectedCount} Service(s) ausgewählt
					</Text>

					{/* Status Update */}
					<Select onValueChange={(value) => onBulkStatusUpdate(value as 'active' | 'inactive')}>
						<Select.Trigger className="w-auto">
							<Select.Value placeholder="Status ändern" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="active">
								<Edit className="w-4 h-4 mr-2 inline" />
								Auf Aktiv setzen
							</Select.Item>
							<Select.Item value="inactive">
								<Edit className="w-4 h-4 mr-2 inline" />
								Auf Inaktiv setzen
							</Select.Item>
						</Select.Content>
					</Select>

					{/* Price Adjustment */}
					<Button
						variant="secondary"
						size="small"
						onClick={onOpenPriceAdjustment}
					>
						<DollarSign className="w-4 h-4 mr-2" />
						Preise anpassen
					</Button>
				</div>

				{/* Clear Selection */}
				<Button
					variant="transparent"
					size="small"
					onClick={onClearSelection}
				>
					<X className="w-4 h-4" />
				</Button>
			</div>
		</div>
	);
}

