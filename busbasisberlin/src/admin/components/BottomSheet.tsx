// busbasisberlin/src/admin/components/BottomSheet.tsx
// Reusable bottom sheet component for mobile sidebar content

import { Drawer, Button, Text } from '@medusajs/ui';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

type BottomSheetProps = {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
};

export function BottomSheet({
	isOpen,
	onClose,
	title,
	children,
}: BottomSheetProps) {
	return (
		<Drawer open={isOpen} onOpenChange={onClose}>
			<Drawer.Content
				className="md:hidden fixed inset-x-0 bottom-0 z-[60] mt-24 flex h-auto max-h-[85vh] flex-col rounded-t-[10px] border-t bg-ui-bg-base"
				aria-describedby={undefined}
			>
				<Drawer.Header className="px-4 py-3 border-b border-ui-border-base flex-shrink-0">
					<div className="flex items-center justify-between">
						<Drawer.Title asChild>
							<Text size="large" weight="plus">
								{title}
							</Text>
						</Drawer.Title>
						<Button
							variant="transparent"
							size="small"
							onClick={onClose}
							className="p-1"
						>
							<X className="w-4 h-4" />
						</Button>
					</div>
				</Drawer.Header>
				<Drawer.Body className="overflow-y-auto flex-1 p-4">
					{children}
				</Drawer.Body>
			</Drawer.Content>
		</Drawer>
	);
}

type FloatingActionButtonProps = {
	onClick: () => void;
	label: string;
	icon?: ReactNode;
};

/**
 * Floating action button for mobile to open bottom sheets
 */
export function FloatingActionButton({
	onClick,
	label,
	icon,
}: FloatingActionButtonProps) {
	return (
		<button
			onClick={onClick}
			className="md:hidden fixed bottom-4 right-4 z-40 bg-ui-button-inverted text-ui-fg-on-inverted rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
			aria-label={label}
		>
			{icon || (
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M3 17V19H9V17H3ZM3 5V7H13V5H3ZM13 21V19H21V17H13V15H11V21H13ZM7 9V11H3V13H7V15H9V9H7ZM21 13V11H11V13H21ZM15 9H17V7H21V5H17V3H15V9Z"
						fill="currentColor"
					/>
				</svg>
			)}
		</button>
	);
}

