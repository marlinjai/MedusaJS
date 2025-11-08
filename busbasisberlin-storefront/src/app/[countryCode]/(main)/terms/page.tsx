// terms/page.tsx
// Dedizierte Seite für die Allgemeinen Geschäftsbedingungen (AGB)
// Ermöglicht direkte Verlinkung aus E-Mails und anderen externen Quellen

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LegalContent from '@modules/layout/components/legal-content';

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations('legal.terms');

	return {
		title: t('title'),
		description: 'Allgemeine Geschäftsbedingungen der Basis Camp Berlin GmbH',
	};
}

export default function TermsPage() {
	return (
		<div className="content-container py-12 md:py-16">
			<div className="max-w-4xl mx-auto">
				<LegalContent type="terms" showHeader={true} />
			</div>
		</div>
	);
}

