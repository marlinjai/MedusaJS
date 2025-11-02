/**
 * user-invited-v2.tsx
 * Unified admin invitation template using EmailWrapper
 */

import {
	EmailWrapper,
	EmailTitle,
	EmailText,
	EmailButton,
	EmailInfoBox,
} from '../utils/email-wrapper';

type UserInvitedEmailProps = {
	invite_url: string;
	email?: string;
};

function UserInvitedEmailComponent({ invite_url, email }: UserInvitedEmailProps) {
	return (
		<EmailWrapper headerVariant="admin">
			<EmailTitle>🎉 Sie sind eingeladen!</EmailTitle>

			<EmailText>Hallo{email ? ` ${email}` : ''},</EmailText>

			<EmailText>
				Sie wurden eingeladen, unserem <strong>Admin-Team</strong> beizutreten.
				Klicken Sie auf die Schaltfläche unten, um Ihre Einladung anzunehmen
				und Ihr Konto einzurichten.
			</EmailText>

			<EmailButton href={invite_url} variant="primary">
				✅ Einladung annehmen
			</EmailButton>

			<EmailText>
				Oder kopieren Sie diese URL und fügen Sie sie in Ihren Browser ein:
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
					href={invite_url}
					style={{
						color: '#2c5aa0',
						fontSize: '13px',
						textDecoration: 'none',
					}}
				>
					{invite_url}
				</a>
			</div>

			<EmailInfoBox title="ℹ️ Wichtige Informationen" variant="info">
				<p style={{ margin: '5px 0' }}>
					• Sie erhalten Zugriff auf das Administrator-Panel
				</p>
				<p style={{ margin: '5px 0' }}>
					• Bitte wählen Sie ein sicheres Passwort (min. 12 Zeichen)
				</p>
				<p style={{ margin: '5px 0' }}>
					• Falls Sie diese Einladung nicht erwartet haben, ignorieren Sie diese
					E-Mail
				</p>
			</EmailInfoBox>
		</EmailWrapper>
	);
}

// Mock data for preview
const mockInvite: UserInvitedEmailProps = {
	invite_url:
		'https://basiscampberlin.de/app/invite?token=sample-token-123',
	email: 'admin@example.com',
};

// Default export for React Email preview
export default () => <UserInvitedEmailComponent {...mockInvite} />;

// Export for service
export const userInvitedEmail = (props: UserInvitedEmailProps) => (
	<UserInvitedEmailComponent {...props} />
);

