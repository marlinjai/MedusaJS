// page-padding.ts
// Reusable padding utility classes for pages that need to account for the hero alert banner
// When the hero alert is visible, pages need extra top padding to prevent content from being hidden

/**
 * Standard page padding that adjusts when hero alert is visible
 * Use this for main content areas in layouts
 */
export const PAGE_PADDING_TOP = 'pt-24 [.hero-alert-visible_&]:pt-32';

/**
 * Large page padding for pages with more spacing needs
 * Use this for pages like store search, product details
 */
export const PAGE_PADDING_TOP_LARGE =
	'pt-32 lg:pt-20 [.hero-alert-visible_&]:pt-40 [.hero-alert-visible_&]:lg:pt-44';

/**
 * Extra large padding for hero sections and special pages
 */
export const PAGE_PADDING_TOP_XLARGE = 'pt-40 [.hero-alert-visible_&]:pt-48';
