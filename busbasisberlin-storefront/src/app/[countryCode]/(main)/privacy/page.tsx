// privacy/page.tsx
// Dedizierte Seite für die Datenschutzerklärung
// Ermöglicht direkte Verlinkung aus E-Mails und anderen externen Quellen

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LegalContent from '@modules/layout/components/legal-content';

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations('legal.privacy');

	return {
		title: t('title'),
		description: 'Datenschutzerklärung der Basis Camp Berlin GmbH',
	};
}

export default function PrivacyPage() {
	return (
		<div className="content-container py-12 md:py-16">
			<div className="max-w-4xl mx-auto">
				<LegalContent type="privacy" showHeader={true} />
			</div>
		</div>
	);
}

