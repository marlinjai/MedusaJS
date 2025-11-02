/**
 * email-components.tsx
 * Reusable email components for consistent branding across all templates
 */

import React from 'react';
import {
	getCompanyInfo,
	getCompanyAddress,
	getCompanySignature,
	getCompanyFooter,
	getCurrentYear,
	getEmailHeaderStyles,
} from './company-info';

/**
 * Email Header Component
 * Displays company logo and branding consistently across all emails
 */
export const EmailHeader = ({
	variant = 'primary',
}: {
	variant?: 'primary' | 'admin' | 'success' | 'danger';
}) => {
	const company = getCompanyInfo();
	const styles = getEmailHeaderStyles(variant);

	return (
		<div
			style={{
				textAlign: 'center',
				marginBottom: '30px',
				borderBottom: `2px solid ${styles.borderColor}`,
				paddingBottom: '20px',
				backgroundColor: styles.backgroundColor,
				padding: '20px',
				borderRadius: '5px 5px 0 0',
			}}
		>
			{company.logoUrl ? (
				<img
					src={company.logoUrl}
					alt={company.name}
					style={{
						maxHeight: '60px',
						maxWidth: '250px',
						marginBottom: '10px',
					}}
				/>
			) : (
				<h1
					style={{
						color: '#ffffff',
						margin: '0',
						fontSize: '24px',
						fontWeight: 'bold',
					}}
				>
					{company.name}
				</h1>
			)}
			<p
				style={{
					color: '#ffffff',
					margin: '5px 0 0 0',
					fontSize: '14px',
					opacity: '0.9',
				}}
			>
				{getCompanyAddress()}
			</p>
		</div>
	);
};

/**
 * Email Footer Component
 * Consistent footer with company info and copyright
 */
export const EmailFooter = () => {
	const company = getCompanyInfo();

	return (
		<div
			style={{
				borderTop: '1px solid #dee2e6',
				paddingTop: '20px',
				fontSize: '12px',
				color: '#666',
				textAlign: 'center',
				marginTop: '30px',
			}}
		>
			<p style={{ margin: '0 0 10px 0' }}>
				Mit freundlichen Grüßen
				<br />
				{getCompanySignature()}
			</p>
			<p style={{ margin: '10px 0', fontSize: '11px' }}>
				{getCompanyFooter()}
			</p>
			<p style={{ margin: '10px 0', fontSize: '10px', color: '#999' }}>
				© {getCurrentYear()} {company.name}. Alle Rechte vorbehalten.
			</p>
		</div>
	);
};

/**
 * Contact Information Component
 * Displays company contact details
 */
export const ContactInfo = () => {
	const company = getCompanyInfo();

	return (
		<div style={{ marginTop: '20px' }}>
			<p
				style={{
					fontSize: '16px',
					lineHeight: '1.5',
					color: '#333',
					marginBottom: '10px',
					fontWeight: '500',
				}}
			>
				Bei Fragen stehen wir Ihnen gerne zur Verfügung:
			</p>
			<ul
				style={{
					fontSize: '14px',
					color: '#555',
					lineHeight: '1.5',
					paddingLeft: '20px',
					margin: '0',
				}}
			>
				<li>📧 E-Mail: {company.supportEmail || company.email}</li>
				{company.phone && <li>📞 Telefon: {company.phone}</li>}
				{company.website && (
					<li>
						🌐 Website:{' '}
						<a
							href={company.website}
							style={{ color: company.primaryColor, textDecoration: 'none' }}
						>
							{company.website.replace('https://', '').replace('http://', '')}
						</a>
					</li>
				)}
			</ul>
		</div>
	);
};

/**
 * Info Box Component
 * Highlighted information box with custom styling
 */
export const InfoBox = ({
	title,
	children,
	variant = 'info',
}: {
	title: string;
	children: React.ReactNode;
	variant?: 'info' | 'success' | 'warning' | 'danger';
}) => {
	const company = getCompanyInfo();

	const variantStyles = {
		info: {
			backgroundColor: '#e8f4f8',
			borderColor: '#b8dce8',
			titleColor: company.primaryColor,
		},
		success: {
			backgroundColor: '#d4edda',
			borderColor: '#c3e6cb',
			titleColor: '#155724',
		},
		warning: {
			backgroundColor: '#fff3cd',
			borderColor: '#ffeaa7',
			titleColor: '#856404',
		},
		danger: {
			backgroundColor: '#f8d7da',
			borderColor: '#f5c6cb',
			titleColor: '#721c24',
		},
	};

	const style = variantStyles[variant];

	return (
		<div
			style={{
				backgroundColor: style.backgroundColor,
				border: `1px solid ${style.borderColor}`,
				borderRadius: '5px',
				padding: '20px',
				marginBottom: '20px',
			}}
		>
			<h3
				style={{
					color: style.titleColor,
					fontSize: '16px',
					marginBottom: '10px',
					marginTop: '0',
					fontWeight: '600',
				}}
			>
				{title}
			</h3>
			<div style={{ fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
				{children}
			</div>
		</div>
	);
};

/**
 * Button Component
 * Consistent CTA button styling
 */
export const Button = ({
	href,
	children,
	variant = 'primary',
}: {
	href: string;
	children: React.ReactNode;
	variant?: 'primary' | 'secondary' | 'danger';
}) => {
	const company = getCompanyInfo();

	const variantStyles = {
		primary: {
			backgroundColor: company.primaryColor,
			hoverColor: company.secondaryColor,
		},
		secondary: {
			backgroundColor: '#6c757d',
			hoverColor: '#5a6268',
		},
		danger: {
			backgroundColor: '#dc3545',
			hoverColor: '#c82333',
		},
	};

	const style = variantStyles[variant];

	return (
		<div style={{ textAlign: 'center', margin: '30px 0' }}>
			<a
				href={href}
				style={{
					display: 'inline-block',
					backgroundColor: style.backgroundColor,
					color: '#ffffff',
					padding: '12px 30px',
					borderRadius: '5px',
					textDecoration: 'none',
					fontSize: '16px',
					fontWeight: 'bold',
				}}
			>
				{children}
			</a>
		</div>
	);
};

/**
 * Email Container Component
 * Main wrapper for email content
 */
export const EmailContainer = ({ children }: { children: React.ReactNode }) => {
	return (
		<div
			style={{
				fontFamily: 'Arial, sans-serif',
				maxWidth: '600px',
				margin: '0 auto',
				padding: '20px',
				backgroundColor: '#ffffff',
			}}
		>
			{children}
		</div>
	);
};

