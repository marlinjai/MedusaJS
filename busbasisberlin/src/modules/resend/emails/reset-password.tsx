/**
 * reset-password-v2.tsx
 * Unified password reset template for customers using EmailWrapper
 */

import {
	EmailWrapper,
	EmailTitle,
	EmailText,
	EmailButton,
	EmailInfoBox,
} from '../utils/email-wrapper';

type PasswordResetEmailProps = {
	url: string;
	email?: string;
};

function PasswordResetEmailComponent({ url, email }: PasswordResetEmailProps) {
	return (
		<EmailWrapper headerVariant="primary">
			<EmailTitle>🔒 Passwort zurücksetzen</EmailTitle>

			<EmailText>Hallo{email ? ` ${email}` : ''},</EmailText>

			<EmailText>
				Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.
				Klicken Sie auf den Button unten, um ein neues Passwort zu erstellen.
			</EmailText>

			<EmailButton href={url}>🔑 Neues Passwort erstellen</EmailButton>

			<EmailText>
				Falls der Button nicht funktioniert, können Sie auch diesen Link
				kopieren und in Ihren Browser einfügen:
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

			<EmailInfoBox title="🔒 Sicherheitshinweis" variant="warning">
				<p style={{ margin: '5px 0' }}>
					• Dieser Link ist nur <strong>24 Stunden gültig</strong>
				</p>
				<p style={{ margin: '5px 0' }}>
					• Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail
					ignorieren
				</p>
				<p style={{ margin: '5px 0' }}>
					• Teilen Sie diesen Link niemals mit anderen Personen
				</p>
			</EmailInfoBox>
		</EmailWrapper>
	);
}

// Mock data for preview
const mockResetData: PasswordResetEmailProps = {
	url: 'https://basiscampberlin.de/reset-password?token=sample-token-123&email=test@basiscampberlin.de',
	email: 'test@basiscampberlin.de',
};

// Default export for React Email preview
export default () => <PasswordResetEmailComponent {...mockResetData} />;

// Export for Resend service
export const passwordResetEmail = (props: PasswordResetEmailProps) => (
	<PasswordResetEmailComponent {...props} />
);

