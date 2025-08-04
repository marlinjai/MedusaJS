/**
 * offer-cancelled.tsx
 * Email template for when an offer is cancelled
 */

interface OfferCancelledEmailProps {
	offer_number: string;
	customer_name?: string;
	offer_id: string;
	status: string;
}

export const offerCancelledEmail = (props: OfferCancelledEmailProps) => {
	const { offer_number, customer_name, offer_id, status } = props;

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
					borderBottom: '2px solid #dc3545',
					paddingBottom: '20px',
				}}
			>
				<h1 style={{ color: '#dc3545', margin: '0', fontSize: '24px' }}>
					Basis Camp Berlin GmbH
				</h1>
				<p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>
					Hauptstrasse 51, 16547 Birkenwerder
				</p>
			</div>

			{/* Main Content */}
			<div style={{ marginBottom: '30px' }}>
				<h2 style={{ color: '#333', fontSize: '20px', marginBottom: '20px' }}>
					Angebot storniert
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
					hiermit bestätigen wir die Stornierung des Angebots{' '}
					<strong>{offer_number}</strong>.
				</p>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					Das stornierte Angebot finden Sie zur Dokumentation als PDF-Datei im
					Anhang dieser E-Mail.
				</p>

				{/* Cancellation Box */}
				<div
					style={{
						backgroundColor: '#f8d7da',
						border: '1px solid #f5c6cb',
						borderRadius: '5px',
						padding: '20px',
						marginBottom: '20px',
					}}
				>
					<h3
						style={{
							color: '#721c24',
							fontSize: '16px',
							marginBottom: '10px',
							marginTop: '0',
						}}
					>
						❌ Angebot storniert
					</h3>
					<p style={{ margin: '5px 0', fontSize: '14px', color: '#721c24' }}>
						<strong>Angebotsnummer:</strong> {offer_number}
					</p>
					<p style={{ margin: '5px 0', fontSize: '14px', color: '#721c24' }}>
						<strong>Status:</strong> Storniert
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
					<strong>Wichtige Hinweise:</strong>
				</p>

				<ul
					style={{
						fontSize: '14px',
						color: '#555',
						lineHeight: '1.5',
						paddingLeft: '20px',
						marginBottom: '20px',
					}}
				>
					<li>Alle Reservierungen wurden automatisch freigegeben</li>
					<li>Es entstehen Ihnen keine Kosten durch diese Stornierung</li>
					<li>Das Angebot kann nicht mehr aktiviert werden</li>
				</ul>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					Falls Sie zu einem späteren Zeitpunkt Interesse an unseren Leistungen
					haben, erstellen wir gerne ein neues Angebot für Sie.
				</p>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					Bei Fragen zur Stornierung stehen wir Ihnen zur Verfügung:
				</p>

				<ul
					style={{
						fontSize: '14px',
						color: '#555',
						lineHeight: '1.5',
						paddingLeft: '20px',
					}}
				>
					<li>E-Mail: info@basiscampberlin.de</li>
					<li>Telefon: [Telefonnummer hier einfügen]</li>
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
					Ihr Team von Basis Camp Berlin GmbH
				</p>
				<p style={{ margin: '0' }}>
					Basis Camp Berlin GmbH | Hauptstrasse 51 | 16547 Birkenwerder |
					info@basiscampberlin.de
				</p>
			</div>
		</div>
	);
};
