/**
 * offer-active.tsx
 * Email template for when an offer becomes active (ready to send to customer)
 */

import {
	getCompanyAddress,
	getCompanyFooter,
	getCompanyInfo,
	getCompanySignature,
} from '../utils/company-info';

interface OfferActiveEmailProps {
	offer_number: string;
	customer_name?: string;
	offer_id: string;
	status: string;
}

export const offerActiveEmail = (props: OfferActiveEmailProps) => {
	const { offer_number, customer_name, offer_id, status } = props;
	const company = getCompanyInfo();

	return (
		<div
			style={{
				fontFamily: 'Arial, sans-serif',
				maxWidth: '600px',
				margin: '0 auto',
				padding: '20px',
			}}
		>
			{/* Header */}
			<div
				style={{
					textAlign: 'center',
					marginBottom: '30px',
					borderBottom: '2px solid #2c5aa0',
					paddingBottom: '20px',
				}}
			>
				<h1 style={{ color: '#2c5aa0', margin: '0', fontSize: '24px' }}>
					{company.name}
				</h1>
				<p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>
					{getCompanyAddress()}
				</p>
			</div>

			{/* Main Content */}
			<div style={{ marginBottom: '30px' }}>
				<h2 style={{ color: '#333', fontSize: '20px', marginBottom: '20px' }}>
					Ihr Angebot ist bereit
				</h2>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					{customer_name
						? `Liebe/r ${customer_name},`
						: 'Sehr geehrte Damen und Herren,'}
				</p>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					vielen Dank für Ihr Interesse an unseren Leistungen. Wir freuen uns,
					Ihnen hiermit unser Angebot <strong>{offer_number}</strong> vorlegen
					zu können.
				</p>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					Das detaillierte Angebot finden Sie als PDF-Datei im Anhang dieser
					E-Mail. Gerne stehen wir Ihnen für Rückfragen zur Verfügung.
				</p>

				{/* Offer Details Box */}
				<div
					style={{
						backgroundColor: '#f8f9fa',
						border: '1px solid #dee2e6',
						borderRadius: '5px',
						padding: '20px',
						marginBottom: '20px',
					}}
				>
					<h3
						style={{
							color: '#2c5aa0',
							fontSize: '16px',
							marginBottom: '10px',
							marginTop: '0',
						}}
					>
						Angebots-Details:
					</h3>
					<p style={{ margin: '5px 0', fontSize: '14px', color: '#555' }}>
						<strong>Angebotsnummer:</strong> {offer_number}
					</p>
					<p style={{ margin: '5px 0', fontSize: '14px', color: '#555' }}>
						<strong>Status:</strong> Aktiv
					</p>
				</div>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					Bei Fragen zu diesem Angebot können Sie uns gerne kontaktieren:
				</p>

				<ul
					style={{
						fontSize: '14px',
						color: '#555',
						lineHeight: '1.5',
						paddingLeft: '20px',
					}}
				>
					<li>E-Mail: {company.email}</li>
					{company.phone && <li>Telefon: {company.phone}</li>}
					{company.website && <li>Website: {company.website}</li>}
				</ul>
			</div>

			{/* Footer */}
			<div
				style={{
					borderTop: '1px solid #dee2e6',
					paddingTop: '20px',
					fontSize: '12px',
					color: '#666',
					textAlign: 'center',
				}}
			>
				<p style={{ margin: '0 0 10px 0' }}>
					Mit freundlichen Grüßen
					<br />
					{getCompanySignature()}
				</p>
				<p style={{ margin: '0' }}>
					{getCompanyFooter()} | {company.email}
				</p>
			</div>
		</div>
	);
};
