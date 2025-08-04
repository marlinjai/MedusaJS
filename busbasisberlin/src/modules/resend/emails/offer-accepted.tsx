/**
 * offer-accepted.tsx
 * Email template for when an offer is accepted by the customer
 */

interface OfferAcceptedEmailProps {
	offer_number: string;
	customer_name?: string;
	offer_id: string;
	status: string;
}

export const offerAcceptedEmail = (props: OfferAcceptedEmailProps) => {
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
					borderBottom: '2px solid #28a745',
					paddingBottom: '20px',
				}}
			>
				<h1 style={{ color: '#28a745', margin: '0', fontSize: '24px' }}>
					Basis Camp Berlin GmbH
				</h1>
				<p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>
					Hauptstrasse 51, 16547 Birkenwerder
				</p>
			</div>

			{/* Main Content */}
			<div style={{ marginBottom: '30px' }}>
				<h2 style={{ color: '#333', fontSize: '20px', marginBottom: '20px' }}>
					Angebot angenommen - Bestätigung
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
					vielen Dank für die Annahme unseres Angebots{' '}
					<strong>{offer_number}</strong>! Wir freuen uns sehr auf die
					Zusammenarbeit mit Ihnen.
				</p>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					Mit dieser E-Mail bestätigen wir die Annahme Ihres Auftrags. Das
					aktualisierte Angebot finden Sie als PDF-Datei im Anhang.
				</p>

				{/* Success Box */}
				<div
					style={{
						backgroundColor: '#d4edda',
						border: '1px solid #c3e6cb',
						borderRadius: '5px',
						padding: '20px',
						marginBottom: '20px',
					}}
				>
					<h3
						style={{
							color: '#155724',
							fontSize: '16px',
							marginBottom: '10px',
							marginTop: '0',
						}}
					>
						✅ Angebot angenommen
					</h3>
					<p style={{ margin: '5px 0', fontSize: '14px', color: '#155724' }}>
						<strong>Angebotsnummer:</strong> {offer_number}
					</p>
					<p style={{ margin: '5px 0', fontSize: '14px', color: '#155724' }}>
						<strong>Status:</strong> Angenommen
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
					<strong>Nächste Schritte:</strong>
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
					<li>Wir werden nun mit der Bearbeitung Ihres Auftrags beginnen</li>
					<li>Sie erhalten in Kürze weitere Informationen zum Projektablauf</li>
					<li>Bei Fragen stehen wir Ihnen jederzeit zur Verfügung</li>
				</ul>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					Kontakt für Rückfragen:
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
