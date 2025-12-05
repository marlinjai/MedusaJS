// hero-alert-padding-wrapper.tsx
// Client component wrapper to apply dynamic padding based on hero alert visibility
// Use this to wrap server components that need dynamic padding

'use client';

import { useHeroAlertPadding } from './use-hero-alert-padding';

type PaddingSize = 'standard' | 'large' | 'xlarge';

type HeroAlertPaddingWrapperProps = {
	children: React.ReactNode;
	size?: PaddingSize;
	className?: string;
};

export default function HeroAlertPaddingWrapper({
	children,
	size = 'standard',
	className = '',
}: HeroAlertPaddingWrapperProps) {
	const padding = useHeroAlertPadding();
	const paddingClass = padding[size];

	return <div className={`${paddingClass} ${className}`}>{children}</div>;
}
