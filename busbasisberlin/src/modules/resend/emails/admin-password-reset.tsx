/**
 * admin-password-reset.tsx
 * Password reset email template for admin users
 * More formal and security-focused than customer reset
 */

import {
	EmailWrapper,
	EmailTitle,
	EmailText,
	EmailButton,
	EmailInfoBox,
} from '../utils/email-wrapper';

type AdminPasswordResetEmailProps = {
	url: string;
	email?: string;
};

function AdminPasswordResetEmailComponent({
	url,
	email,
}: AdminPasswordResetEmailProps) {
	return (
		<EmailWrapper headerVariant="admin">
			<EmailTitle>🔐 Admin-Passwort zurücksetzen</EmailTitle>

			<EmailText>Hallo{email ? ` ${email}` : ''},</EmailText>

			<EmailText>
				Sie haben eine Anfrage zum Zurücksetzen Ihres{' '}
				<strong>Administrator-Passworts</strong> gestellt. Klicken Sie auf den
				Button unten, um ein neues Passwort für Ihren Admin-Zugang zu erstellen.
			</EmailText>

			<EmailButton href={url} variant="danger">
				🔑 Admin-Passwort zurücksetzen
			</EmailButton>

			<EmailText>
				Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren
				Browser:
			</EmailText>

			<div
				style={{
					backgroundColor: '#f8f9fa',
					padding: '15px',
					borderRadius: '5px',
					marginBottom: '20px',
					wordBreak: 'break-all',
				}}
			>
				<a
					href={url}
					style={{
						color: '#2c5aa0',
						fontSize: '13px',
						textDecoration: 'none',
					}}
				>
					{url}
				</a>
			</div>

			<EmailInfoBox title="⚠️ WICHTIGER SICHERHEITSHINWEIS" variant="danger">
				<p style={{ margin: '8px 0' }}>
					<strong>Dies ist ein Administrator-Zugang.</strong> Dieser Link
					gewährt Zugriff auf sensible Systemfunktionen.
				</p>
				<p style={{ margin: '8px 0' }}>
					• Link ist nur <strong>24 Stunden</strong> gültig
				</p>
				<p style={{ margin: '8px 0' }}>
					• Teilen Sie diesen Link <strong>niemals</strong> mit anderen
				</p>
				<p style={{ margin: '8px 0' }}>
					• Falls Sie diese Anfrage nicht gestellt haben,{' '}
					<strong>kontaktieren Sie sofort das IT-Team</strong>
				</p>
			</EmailInfoBox>

			<EmailInfoBox title="ℹ️ Best Practices" variant="info">
				<ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
					<li>Verwenden Sie ein starkes Passwort (min. 12 Zeichen)</li>
					<li>Aktivieren Sie 2-Faktor-Authentifizierung, falls verfügbar</li>
					<li>Nutzen Sie einen Passwort-Manager</li>
					<li>Verwenden Sie keine bereits genutzten Passwörter</li>
				</ul>
			</EmailInfoBox>

			<div
				style={{
					backgroundColor: '#f1f3f5',
					padding: '15px',
					borderRadius: '5px',
					marginTop: '20px',
				}}
			>
				<p
					style={{
						fontSize: '12px',
						color: '#666',
						margin: '0',
						lineHeight: '1.6',
					}}
				>
					<strong>Hinweis zur Sicherheit:</strong> Alle
					Passwort-Reset-Anfragen werden protokolliert. IP-Adresse, Datum und
					Uhrzeit dieser Anfrage wurden zu Sicherheitszwecken gespeichert.
				</p>
			</div>
		</EmailWrapper>
	);
}

// Mock data for preview/development
const mockResetData: AdminPasswordResetEmailProps = {
	url: 'https://admin.basiscampberlin.de/admin-password-reset?token=admin-sample-token-123&email=admin@basiscampberlin.de',
	email: 'admin@basiscampberlin.de',
};

// Default export for React Email preview
export default () => <AdminPasswordResetEmailComponent {...mockResetData} />;

// Export for Resend service
export const adminPasswordResetEmail = (
	props: AdminPasswordResetEmailProps,
) => <AdminPasswordResetEmailComponent {...props} />;
