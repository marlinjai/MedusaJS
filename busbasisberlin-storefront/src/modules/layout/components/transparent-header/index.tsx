'use client';

import { useEffect, useState } from 'react';

export default function TransparentHeader() {
	const [isScrolled, setIsScrolled] = useState(false);
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollY = window.scrollY;

			// Update background transparency based on scroll position
			setIsScrolled(currentScrollY > 50);

			// Hide/show header based on scroll direction
			if (currentScrollY < 10) {
				// Always show at top of page
				setIsVisible(true);
			} else if (currentScrollY > lastScrollY && currentScrollY > 100) {
				// Scrolling down - hide header
				setIsVisible(false);
			} else if (currentScrollY < lastScrollY) {
				// Scrolling up - show header
				setIsVisible(true);
			}

			setLastScrollY(currentScrollY);
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, [lastScrollY]);

	return (
		<style jsx global>{`
			.nav-header {
				background-color: ${isScrolled
					? 'rgba(0, 0, 0, 0.8)'
					: 'rgba(0, 0, 0, 0.52)'};
				backdrop-filter: ${isScrolled ? 'blur(8px)' : 'blur(3px)'};
				transform: translateY(${isVisible ? '0' : '-100%'});
				transition: transform 0.3s ease-in-out,
					background-color 0.3s ease-in-out, backdrop-filter 0.3s ease-in-out;
			}
		`}</style>
	);
}
