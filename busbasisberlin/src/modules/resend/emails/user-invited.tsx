// src/modules/resend/emails/user-invited.tsx
import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from '@react-email/components';

type UserInvitedEmailProps = {
	invite_url: string;
	email?: string;
};

function UserInvitedEmailComponent({
	invite_url,
	email,
}: UserInvitedEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>Sie wurden eingeladen, unserem Team beizutreten</Preview>
			<Tailwind>
				<Body className="bg-white my-auto mx-auto font-sans px-2">
					<Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
						<Section className="mt-[32px]">
							<Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
								Sie sind eingeladen!
							</Heading>
						</Section>

						<Section className="my-[32px]">
							<Text className="text-black text-[14px] leading-[24px]">
								Hallo{email ? ` ${email}` : ''},
							</Text>
							<Text className="text-black text-[14px] leading-[24px]">
								Sie wurden eingeladen, unserem Admin-Team beizutreten. Klicken
								Sie auf die Schaltfläche unten, um Ihre Einladung anzunehmen und
								Ihr Konto einzurichten.
							</Text>
						</Section>

						<Section className="text-center mt-[32px] mb-[32px]">
							<Button
								className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
								href={invite_url}
							>
								Einladung annehmen
							</Button>
						</Section>

						<Section className="my-[32px]">
							<Text className="text-black text-[14px] leading-[24px]">
								Oder kopieren Sie diese URL und fügen Sie sie in Ihren Browser
								ein:
							</Text>
							<Link
								href={invite_url}
								className="text-blue-600 no-underline text-[14px] leading-[24px] break-all"
							>
								{invite_url}
							</Link>
						</Section>

						<Section className="mt-[32px]">
							<Text className="text-[#666666] text-[12px] leading-[24px]">
								Falls Sie diese Einladung nicht erwartet haben, können Sie diese
								E-Mail ignorieren.
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}

export const userInvitedEmail = (props: UserInvitedEmailProps) => (
	<UserInvitedEmailComponent {...props} />
);

// Mock data for preview/development
const mockInvite: UserInvitedEmailProps = {
	invite_url: 'https://basiscamp-berlin.de/app/invite?token=sample-token-123',
	email: 'user@example.com',
};

export default () => <UserInvitedEmailComponent {...mockInvite} />;
