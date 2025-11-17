// hero/index.tsx

'use client';

import { Heading } from '@medusajs/ui';
import SearchModal from '@modules/search/components/modal';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const Hero = () => {
	const t = useTranslations('hero');
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchEnabled, setSearchEnabled] = useState(true);

	useEffect(() => {
		const loadSettings = async () => {
			try {
				const response = await fetch('/api/public/settings');
				if (response.ok) {
					const data = await response.json();
					setSearchEnabled(data.search?.enabled !== false);
				}
			} catch (error) {
				console.error('Failed to load search settings:', error);
				// Default to enabled if settings can't be loaded
				setSearchEnabled(true);
			}
		};
		loadSettings();
	}, []);

	const scrollToServices = () => {
		const servicesSection = document.getElementById('services');
		servicesSection?.scrollIntoView({ behavior: 'smooth' });
	};

	return (
		<div className="relative h-screen md:h-[112vh] w-full overflow-hidden -mt-24">
			{/* Video Background */}
			<video
				autoPlay
				loop
				muted
				playsInline
				className="absolute inset-0 w-full h-full object-cover"
			>
				<source src="/videos/HeaderVideo.webm" type="video/webm" />
				{t('videoNotSupported')}
			</video>

			{/* Dark Overlay */}
			<div className="absolute inset-0 bg-black bg-opacity-20" />

			{/* Content Overlay */}
			<div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8">
				{/* Title Background with Feathered Edges */}
				<div className="absolute inset-x-48 -inset-y-36">
					<div
						className="absolute inset-0 bg-black/90"
						style={{
							mask: 'radial-gradient(ellipse at center, black, transparent 50%)',
							WebkitMask:
								'radial-gradient(ellipse at center, black, transparent 50%)',
						}}
					/>
				</div>

				<div className="relative max-w-3xl mx-auto">
					<Heading
						level="h1"
						className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 [text-shadow:_2px_2px_10px_rgb(0_0_0_/_40%)]"
					>
						{t('title')}
					</Heading>
					<Heading
						level="h2"
						className="text-xl sm:text-2xl lg:text-3xl text-white/90 font-light [text-shadow:_1px_1px_5px_rgb(0_0_0_/_40%)]"
					>
						{t('subtitle')}
					</Heading>
				</div>

				{/* Search CTA Button - opens search modal (only if search is enabled) */}
				{searchEnabled && (
					<button
						onClick={() => setIsSearchOpen(true)}
						className="mt-8 px-8 py-3 bg-white bg-opacity-10 hover:bg-opacity-20 border-2 border-white text-white text-lg font-medium rounded-full transition-all z-30 duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
					>
						{t('cta')}
					</button>
				)}
			</div>

			{/* Search Modal */}
			<SearchModal
				externalIsOpen={isSearchOpen}
				externalSetIsOpen={setIsSearchOpen}
			/>

			{/* Scroll Indicator with Rotating Text */}
			<button
				onClick={scrollToServices}
				className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10 group cursor-pointer"
			>
				{/* Blur Background for Scroll Indicator */}
				<div className="absolute -inset-4">
					<div
						className="absolute inset-0 bg-black/20 backdrop-blur-[30px] rounded-full"
						style={{
							mask: 'radial-gradient(circle at center, black 40%, transparent 100%)',
							WebkitMask:
								'radial-gradient(circle at center, black 40%, transparent 100%)',
						}}
					/>
				</div>

				{/* Rotating Text Container */}
				<div className="relative w-32 h-32">
					{/* Rotating Text */}
					<div className="absolute inset-0 animate-[spin_12s_linear_infinite]">
						<svg viewBox="0 0 100 100" className="w-full h-full">
							<defs>
								<path
									id="circle"
									d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
								/>
							</defs>
							<text className="text-[11px] fill-white opacity-70">
								<textPath href="#circle" startOffset="0%">
									{t('scrollIndicator')}
								</textPath>
							</text>
						</svg>
					</div>

					{/* Arrow Container - Grouped with text rotation */}
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="animate-[bounce_4s_cubic-bezier(0.25,0.1,0.25,1)_infinite] transition-all duration-600">
							<svg
								className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-105"
								fill="none"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
							</svg>
						</div>
					</div>
				</div>
			</button>
		</div>
	);
};

export default Hero;
