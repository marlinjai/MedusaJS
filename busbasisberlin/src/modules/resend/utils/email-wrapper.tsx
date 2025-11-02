/**
 * email-wrapper.tsx
 * Universal email wrapper with consistent branding
 * All email templates use this for unified look & feel
 */

import React from 'react';
import {
	getCompanyFooter,
	getCompanyInfo,
	getCompanySignature,
	getCurrentYear,
	getEmailHeaderStyles,
} from './company-info';

interface EmailWrapperProps {
	children: React.ReactNode;
	headerVariant?: 'primary' | 'admin' | 'success' | 'danger';
	title?: string;
}

/**
 * Universal Email Wrapper Component
 * Wraps all email content with consistent header, footer, and branding
 */
export const EmailWrapper = ({
	children,
	headerVariant = 'primary',
	title,
}: EmailWrapperProps) => {
	const company = getCompanyInfo();
	const headerStyles = getEmailHeaderStyles(headerVariant);

	return (
		<div
			style={{
				fontFamily: 'Arial, sans-serif',
				maxWidth: '600px',
				margin: '0 auto',
				padding: '0',
				backgroundColor: '#ffffff',
			}}
		>
			{/* Email Header with Logo */}
			<div
				style={{
					textAlign: 'center',
					backgroundColor: headerStyles.backgroundColor,
					padding: '30px 20px',
					borderBottom: `3px solid ${headerStyles.borderColor}`,
				}}
			>
				{company.logoUrl ? (
					<img
						src={company.logoUrl}
						alt={company.name}
						style={{
							maxHeight: '60px',
							maxWidth: '250px',
							display: 'block',
							margin: '0 auto',
						}}
					/>
				) : (
					<h1
						style={{
							color: '#ffffff',
							margin: '0',
							fontSize: '28px',
							fontWeight: 'bold',
						}}
					>
						{company.name}
					</h1>
				)}
			</div>

			{/* Main Content Area */}
			<div style={{ padding: '30px 20px' }}>{children}</div>

			{/* Email Footer */}
			<div
				style={{
					borderTop: '2px solid #e0e0e0',
					backgroundColor: '#f8f9fa',
					padding: '25px 20px',
					textAlign: 'center',
				}}
			>
				<p
					style={{
						margin: '0 0 15px 0',
						fontSize: '14px',
						color: '#333',
						fontWeight: '500',
					}}
				>
					Mit freundlichen Grüßen
					<br />
					{getCompanySignature()}
				</p>
				<p
					style={{
						margin: '10px 0',
						fontSize: '12px',
						color: '#666',
						lineHeight: '1.6',
					}}
				>
					{getCompanyFooter()}
					<br />
					{company.supportEmail && (
						<>
							📧 {company.supportEmail}
							<br />
						</>
					)}
					📞 Telefon auf Anfrage per E-Mail
					<br />
					{company.website && (
						<>
							🌐{' '}
							<a
								href={company.website}
								style={{
									color: company.primaryColor,
									textDecoration: 'none',
								}}
							>
								{company.website.replace('https://', '').replace('http://', '')}
							</a>
						</>
					)}
				</p>
				<p
					style={{
						margin: '15px 0 0 0',
						fontSize: '11px',
						color: '#999',
					}}
				>
					© {getCurrentYear()} {company.name}. Alle Rechte vorbehalten.
				</p>
			</div>
		</div>
	);
};

/**
 * Reusable Components for Email Content
 */

export const EmailTitle = ({ children }: { children: React.ReactNode }) => (
	<h2
		style={{
			color: '#333',
			fontSize: '24px',
			marginBottom: '20px',
			marginTop: '0',
			fontWeight: 'bold',
		}}
	>
		{children}
	</h2>
);

export const EmailText = ({ children }: { children: React.ReactNode }) => (
	<p
		style={{
			fontSize: '16px',
			lineHeight: '1.6',
			color: '#333',
			marginBottom: '15px',
		}}
	>
		{children}
	</p>
);

export const EmailButton = ({
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
		primary: company.primaryColor,
		secondary: '#6c757d',
		danger: '#dc3545',
	};

	return (
		<div style={{ textAlign: 'center', margin: '30px 0' }}>
			<a
				href={href}
				style={{
					display: 'inline-block',
					backgroundColor: variantStyles[variant],
					color: '#ffffff',
					padding: '14px 35px',
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

export const EmailInfoBox = ({
	title,
	children,
	variant = 'info',
}: {
	title?: string;
	children: React.ReactNode;
	variant?: 'info' | 'success' | 'warning' | 'danger';
}) => {
	const variantStyles = {
		info: {
			backgroundColor: '#e8f4f8',
			borderColor: '#b8dce8',
			textColor: '#0c5460',
		},
		success: {
			backgroundColor: '#d4edda',
			borderColor: '#c3e6cb',
			textColor: '#155724',
		},
		warning: {
			backgroundColor: '#fff3cd',
			borderColor: '#ffeaa7',
			textColor: '#856404',
		},
		danger: {
			backgroundColor: '#f8d7da',
			borderColor: '#f5c6cb',
			textColor: '#721c24',
		},
	};

	const style = variantStyles[variant];

	return (
		<div
			style={{
				backgroundColor: style.backgroundColor,
				border: `2px solid ${style.borderColor}`,
				borderRadius: '5px',
				padding: '20px',
				marginBottom: '20px',
			}}
		>
			{title && (
				<h3
					style={{
						color: style.textColor,
						fontSize: '16px',
						marginBottom: '10px',
						marginTop: '0',
						fontWeight: 'bold',
					}}
				>
					{title}
				</h3>
			)}
			<div
				style={{
					fontSize: '14px',
					color: style.textColor,
					lineHeight: '1.6',
				}}
			>
				{children}
			</div>
		</div>
	);
};

export const EmailList = ({ items }: { items: string[] }) => (
	<ul
		style={{
			fontSize: '14px',
			color: '#555',
			lineHeight: '1.8',
			paddingLeft: '20px',
			marginBottom: '20px',
		}}
	>
		{items.map((item, index) => (
			<li key={index}>{item}</li>
		))}
	</ul>
);

export const EmailDivider = () => (
	<div
		style={{
			borderTop: '1px solid #e0e0e0',
			margin: '30px 0',
		}}
	/>
);
