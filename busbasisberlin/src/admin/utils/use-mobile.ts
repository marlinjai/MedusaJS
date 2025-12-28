// busbasisberlin/src/admin/utils/use-mobile.ts
// Mobile detection hooks for responsive behavior

import { useEffect, useState } from 'react';

/**
 * Hook to detect if device is mobile (below md breakpoint - 768px)
 */
export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		// Initial check
		checkMobile();

		// Listen for resize
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	return isMobile;
}

/**
 * Hook to detect device orientation
 */
export function useOrientation(): 'portrait' | 'landscape' {
	const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
		'portrait'
	);

	useEffect(() => {
		const checkOrientation = () => {
			setOrientation(
				window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
			);
		};

		// Initial check
		checkOrientation();

		// Listen for resize and orientation change
		window.addEventListener('resize', checkOrientation);
		window.addEventListener('orientationchange', checkOrientation);

		return () => {
			window.removeEventListener('resize', checkOrientation);
			window.removeEventListener('orientationchange', checkOrientation);
		};
	}, []);

	return orientation;
}

/**
 * Hook to detect if landscape prompt should be shown
 * Shows for mobile portrait mode with dismissible storage
 */
export function useLandscapePrompt(
	columnCount: number,
	storageKey: string
): {
	shouldShow: boolean;
	dismiss: () => void;
} {
	const isMobile = useIsMobile();
	const orientation = useOrientation();
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		// Check if user has dismissed this prompt before
		const isDismissed = localStorage.getItem(storageKey) === 'true';
		setDismissed(isDismissed);
	}, [storageKey]);

	const dismiss = () => {
		localStorage.setItem(storageKey, 'true');
		setDismissed(true);
	};

	// Show if mobile, portrait, has 5+ columns, and not dismissed
	const shouldShow =
		isMobile && orientation === 'portrait' && columnCount >= 5 && !dismissed;

	return { shouldShow, dismiss };
}

/**
 * Hook for viewport dimensions
 */
export function useViewportSize() {
	const [size, setSize] = useState({
		width: 0,
		height: 0,
	});

	useEffect(() => {
		const handleResize = () => {
			setSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		};

		// Initial size
		handleResize();

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	return size;
}


