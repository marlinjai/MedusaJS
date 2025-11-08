/**
 * company-info.ts
 * Utility functions to get company information from environment variables
 * Used for consistent branding across all email templates
 */

export interface CompanyInfo {
	name: string;
	address: string;
	postalCode: string;
	city: string;
	email: string;
	phone?: string;
	website?: string;
	logoUrl?: string;
	supportEmail?: string;
	primaryColor: string;
	secondaryColor: string;
}

/**
 * Get company information from environment variables
 */
export function getCompanyInfo(): CompanyInfo {
	return {
		name: process.env.COMPANY_NAME || 'Basis Camp Berlin',
		address: process.env.COMPANY_ADDRESS || 'Hauptstraße 51',
		postalCode: process.env.COMPANY_POSTAL_CODE || '16547',
		city: process.env.COMPANY_CITY || 'Birkenwerder',
		email: process.env.COMPANY_EMAIL || 'info@basiscampberlin.de',
		phone: process.env.COMPANY_PHONE || '+49 3303 5365540',
		website:
			process.env.STOREFRONT_URL ||
			process.env.NEXT_PUBLIC_STOREFRONT_URL ||
			'https://www.basiscampberlin.de',
		logoUrl: process.env.COMPANY_LOGO_URL,
		supportEmail:
			process.env.COMPANY_SUPPORT_EMAIL ||
			process.env.COMPANY_EMAIL ||
			'info@basiscampberlin.de',
		// Brand colors - can be customized via environment variables
		primaryColor: process.env.BRAND_PRIMARY_COLOR || '#2c5aa0',
		secondaryColor: process.env.BRAND_SECONDARY_COLOR || '#1e40af',
	};
}

/**
 * Get formatted company address
 */
export function getCompanyAddress(): string {
	const company = getCompanyInfo();
	return `${company.address}, ${company.postalCode} ${company.city}`;
}

/**
 * Get company signature for emails
 */
export function getCompanySignature(): string {
	const company = getCompanyInfo();
	return `Ihr Team von ${company.name}`;
}

/**
 * Get company footer for emails
 */
export function getCompanyFooter(): string {
	const company = getCompanyInfo();
	return `${company.name} | ${company.address} | ${company.postalCode} ${company.city}`;
}

/**
 * Get company logo HTML for email headers
 * Returns either an image tag with logo or company name as fallback
 */
export function getCompanyLogoHtml(): string {
	const company = getCompanyInfo();

	if (company.logoUrl) {
		return `<img src="${company.logoUrl}" alt="${company.name}" style="max-height: 50px; max-width: 200px;" />`;
	}

	// Fallback to company name if no logo
	return `<span style="font-size: 24px; font-weight: bold; color: ${company.primaryColor}">${company.name}</span>`;
}

/**
 * Get consistent email header styles
 */
export function getEmailHeaderStyles(
	variant: 'primary' | 'admin' | 'success' | 'danger' = 'primary',
): {
	backgroundColor: string;
	borderColor: string;
} {
	const company = getCompanyInfo();

	const variants = {
		primary: {
			backgroundColor: company.primaryColor,
			borderColor: company.primaryColor,
		},
		admin: {
			backgroundColor: '#1f2937', // Dark gray for admin
			borderColor: '#374151',
		},
		success: {
			backgroundColor: '#28a745', // Green
			borderColor: '#218838',
		},
		danger: {
			backgroundColor: '#dc3545', // Red
			borderColor: '#c82333',
		},
	};

	return variants[variant];
}

/**
 * Get current year for copyright notices
 */
export function getCurrentYear(): string {
	return new Date().getFullYear().toString();
}
