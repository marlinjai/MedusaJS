// sign-in-prompt/index.tsx

'use client';

import { useTranslations } from 'next-intl';
import { Button, Heading, Text } from '@medusajs/ui';
import LocalizedClientLink from '@modules/common/components/localized-client-link';

const SignInPrompt = () => {
	const t = useTranslations('cart.signInPrompt');

	return (
		<div className="bg-stone-950 rounded-xl p-6 flex items-center justify-between">
			<div>
				<Heading level="h2" className="txt-xlarge text-gray-100">
					{t('title')}
				</Heading>
				<Text className="txt-medium text-gray-400 mt-2">
					{t('description')}
				</Text>
			</div>
			<div>
				<LocalizedClientLink href="/account">
					<Button
						variant="secondary"
						className="h-10"
						data-testid="sign-in-button"
					>
						{t('button')}
					</Button>
				</LocalizedClientLink>
			</div>
		</div>
	);
};

export default SignInPrompt;
