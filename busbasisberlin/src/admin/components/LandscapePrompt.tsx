// busbasisberlin/src/admin/components/LandscapePrompt.tsx
// Dismissible prompt suggesting landscape orientation for complex tables

import { X, RotateCw } from 'lucide-react';
import { Button, Text } from '@medusajs/ui';

type LandscapePromptProps = {
	onDismiss: () => void;
};

export function LandscapePrompt({ onDismiss }: LandscapePromptProps) {
	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-ui-bg-base border-t border-ui-border-base shadow-lg p-2 md:hidden">
			<div className="flex items-center gap-2 max-w-full">
				<div className="flex-shrink-0 text-ui-fg-subtle">
					<RotateCw className="w-5 h-5" />
				</div>
				<div className="flex-1 min-w-0">
					<Text size="small" className="text-ui-fg-base">
						Für bessere Übersicht Gerät drehen
					</Text>
				</div>
				<Button
					variant="transparent"
					size="small"
					onClick={onDismiss}
					className="flex-shrink-0 p-1"
				>
					<X className="w-4 h-4" />
				</Button>
			</div>
		</div>
	);
}


