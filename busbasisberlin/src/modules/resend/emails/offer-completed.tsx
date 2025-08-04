/**
 * offer-completed.tsx
 * Email template for when an offer is completed/fulfilled
 */

interface OfferCompletedEmailProps {
	offer_number: string;
	customer_name?: string;
	offer_id: string;
	status: string;
}

export const offerCompletedEmail = (props: OfferCompletedEmailProps) => {
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
					borderBottom: '2px solid #007bff',
					paddingBottom: '20px',
				}}
			>
				<h1 style={{ color: '#007bff', margin: '0', fontSize: '24px' }}>
					Basis Camp Berlin GmbH
				</h1>
				<p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>
					Hauptstrasse 51, 16547 Birkenwerder
				</p>
			</div>

			{/* Main Content */}
			<div style={{ marginBottom: '30px' }}>
				<h2 style={{ color: '#333', fontSize: '20px', marginBottom: '20px' }}>
					Angebot erfolgreich abgeschlossen
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
					wir freuen uns, Ihnen mitteilen zu können, dass Ihr Auftrag{' '}
					<strong>{offer_number}</strong>
					erfolgreich abgeschlossen wurde.
				</p>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					Alle vereinbarten Leistungen wurden erbracht. Das finale Angebot mit
					allen Details finden Sie als PDF-Datei im Anhang dieser E-Mail.
				</p>

				{/* Completion Box */}
				<div
					style={{
						backgroundColor: '#cce5ff',
						border: '1px solid #99ccff',
						borderRadius: '5px',
						padding: '20px',
						marginBottom: '20px',
					}}
				>
					<h3
						style={{
							color: '#0056b3',
							fontSize: '16px',
							marginBottom: '10px',
							marginTop: '0',
						}}
					>
						🎉 Projekt abgeschlossen
					</h3>
					<p style={{ margin: '5px 0', fontSize: '14px', color: '#0056b3' }}>
						<strong>Angebotsnummer:</strong> {offer_number}
					</p>
					<p style={{ margin: '5px 0', fontSize: '14px', color: '#0056b3' }}>
						<strong>Status:</strong> Abgeschlossen
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
					<strong>Was passiert als nächstes:</strong>
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
					<li>
						Sie erhalten zeitnah die finale Rechnung für die erbrachten
						Leistungen
					</li>
					<li>
						Alle Projektunterlagen wurden entsprechend Ihrer Vereinbarung
						übermittelt
					</li>
					<li>Unser Support steht Ihnen auch weiterhin zur Verfügung</li>
				</ul>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					Wir bedanken uns für Ihr Vertrauen und die angenehme Zusammenarbeit.
					Gerne sind wir auch in Zukunft Ihr Partner für weitere Projekte.
				</p>

				<p
					style={{
						fontSize: '16px',
						lineHeight: '1.5',
						color: '#333',
						marginBottom: '15px',
					}}
				>
					Bei Fragen stehen wir Ihnen selbstverständlich zur Verfügung:
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
