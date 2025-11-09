'use client';

import { Button } from '@medusajs/ui';
import React from 'react';
import { useFormStatus } from 'react-dom';

export function SubmitButton({
	children,
	variant = 'primary',
	disabled = false,
	className,
	'data-testid': dataTestId,
}: {
	children: React.ReactNode;
	variant?: 'primary' | 'secondary' | 'transparent' | 'danger' | null;
	disabled?: boolean;
	className?: string;
	'data-testid'?: string;
}) {
	const { pending } = useFormStatus();

	return (
		<Button
			size="large"
			className={className}
			type="submit"
			disabled={disabled}
			isLoading={pending}
			variant={variant || 'primary'}
			data-testid={dataTestId}
		>
			{children}
		</Button>
	);
}
