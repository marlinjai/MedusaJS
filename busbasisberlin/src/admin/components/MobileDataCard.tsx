// busbasisberlin/src/admin/components/MobileDataCard.tsx
// Reusable card component for mobile data display

import { Badge, Checkbox, Text } from '@medusajs/ui';
import { Eye, Copy, Trash2, Edit2 } from 'lucide-react';
import { ReactNode } from 'react';

type CardAction = {
	icon: ReactNode;
	onClick: () => void;
	label: string;
};

type CardRow = {
	label: string;
	value: ReactNode;
};

type MobileDataCardProps = {
	recordId: string;
	rows: CardRow[];
	actions?: CardAction[];
	onSelect?: () => void;
	selected?: boolean;
};

export function MobileDataCard({
	recordId,
  rows,
	actions = [],
	onSelect,
	selected = false,
}: MobileDataCardProps) {
  return (
		<div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-3 mb-2 shadow-sm">
			{/* Header Row */}
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-ui-border-base">
        <div className="flex items-center gap-2">
					{onSelect && (
						<Checkbox checked={selected} onCheckedChange={onSelect} />
          )}
					<Text weight="plus" className="text-sm">
						{recordId}
          </Text>
        </div>
				<div className="flex items-center gap-1">
					{actions.map((action, index) => (
						<button
							key={index}
							onClick={action.onClick}
							className="p-2 hover:bg-ui-bg-subtle rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
							aria-label={action.label}
						>
							{action.icon}
						</button>
					))}
        </div>
      </div>

			{/* Data Rows */}
			<div className="space-y-2">
        {rows.map((row, index) => (
					<div
						key={index}
						className="flex justify-between items-start py-1.5 border-b border-ui-border-base last:border-0"
					>
						<Text size="small" className="text-ui-fg-subtle min-w-[100px]">
              {row.label}
            </Text>
						<div className="text-right flex-1">
							{typeof row.value === 'string' ? (
								<Text size="small" weight="plus">
              {row.value}
								</Text>
							) : (
								row.value
							)}
            </div>
          </div>
        ))}
      </div>
    </div>
	);
}

// Export common icons for convenience
export const CardIcons = {
	Eye,
	Copy,
	Trash: Trash2,
	Edit: Edit2,
};
