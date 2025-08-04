/**
 * company-info.ts
 * Utility functions to get company information from environment variables
 */

export interface CompanyInfo {
	name: string;
	address: string;
	postalCode: string;
	city: string;
	email: string;
	phone?: string;
	website?: string;
}

/**
 * Get company information from environment variables
 */
export function getCompanyInfo(): CompanyInfo {
	return {
		name: process.env.COMPANY_NAME || 'Your Company Name',
		address: process.env.COMPANY_ADDRESS || 'Your Company Address',
		postalCode: process.env.COMPANY_POSTAL_CODE || '12345',
		city: process.env.COMPANY_CITY || 'Your City',
		email: process.env.COMPANY_EMAIL || 'info@yourcompany.com',
		phone: process.env.COMPANY_PHONE,
		website: process.env.COMPANY_WEBSITE,
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
