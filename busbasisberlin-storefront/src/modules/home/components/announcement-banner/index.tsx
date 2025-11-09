// busbasisberlin-storefront/src/modules/home/components/announcement-banner/index.tsx
// Horizontal scrolling marquee banner for announcements

'use client';

import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

type AnnouncementBannerData = {
	enabled: boolean;
	text: string;
	color: string;
	font_size: 'small' | 'medium' | 'large';
};

const AnnouncementBanner = () => {
	const [banner, setBanner] = useState<AnnouncementBannerData | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchBannerSettings = async () => {
			try {
				const backendUrl =
					process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
				const response = await fetch(`${backendUrl}/public/settings`, {
					cache: 'no-store',
				});

				if (response.ok) {
					const data = await response.json();
					setBanner(data.announcement_banner);
				}
			} catch (error) {
				console.error('[ANNOUNCEMENT-BANNER] Failed to load banner:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchBannerSettings();
	}, []);

	// Don't render if loading, disabled, or empty text
	if (isLoading || !banner || !banner.enabled || !banner.text.trim()) {
		return null;
	}

	// Determine text color based on background color brightness
	const getTextColor = (bgColor: string): string => {
		// Convert hex to RGB
		const hex = bgColor.replace('#', '');
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		// Calculate brightness
		const brightness = (r * 299 + g * 587 + b * 114) / 1000;
		// Use white text for dark backgrounds, black for light
		return brightness > 128 ? 'text-black' : 'text-white';
	};

	// Get font size classes
	const getFontSizeClass = (size: 'small' | 'medium' | 'large') => {
		switch (size) {
			case 'small':
				return 'text-xs';
			case 'large':
				return 'text-lg';
			default:
				return 'text-sm md:text-base';
		}
	};

	const textColor = getTextColor(banner.color);
	const fontSizeClass = getFontSizeClass(banner.font_size);

	// Create 12 copies for seamless infinite scrolling
	// More copies ensure smooth scrolling even with short text
	const numCopies = 12;
	const copies = Array(numCopies).fill(null);

	return (
		<div
			className={`relative w-full overflow-hidden ${textColor} h-10 md:h-12`}
			style={{ backgroundColor: banner.color }}
		>
			{/* Marquee wrapper - contains the scrolling content */}
			<div className="absolute inset-0 flex items-center overflow-hidden">
				{/* Marquee container - will be animated to scroll continuously */}
				<div className="flex items-center animate-marquee whitespace-nowrap">
					{/* Render multiple copies with gaps for seamless infinite loop */}
					{copies.map((_, index) => (
						<div
							key={index}
							className="flex items-center gap-3 px-24 flex-shrink-0"
						>
							<Info className="w-5 h-5 flex-shrink-0" />
							<span className={`${fontSizeClass} font-medium`}>
								{banner.text}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default AnnouncementBanner;
