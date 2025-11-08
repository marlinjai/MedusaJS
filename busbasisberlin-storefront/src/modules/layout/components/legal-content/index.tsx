// legal-content/index.tsx
// Wiederverwendbare Komponente für Legal-Inhalte (AGB, Datenschutz, etc.)
// Kann sowohl in Modals als auch auf dedizierten Pages verwendet werden

'use client';

import { useTranslations } from 'next-intl';

type LegalContentProps = {
	type: 'privacy' | 'terms' | 'imprint' | 'vereinsatzung';
	showHeader?: boolean; // Optional: Header nur auf Pages anzeigen, nicht im Modal
};

export default function LegalContent({ type, showHeader = false }: LegalContentProps) {
	const t = useTranslations('legal');

	const content = {
		privacy: {
			title: t('privacy.title'),
			sections: [
				{
					title: t('privacy.intro.title'),
					content: t('privacy.intro.content'),
				},
				{
					title: t('privacy.dataCollection.title'),
					content: t('privacy.dataCollection.content'),
				},
				{
					title: t('privacy.dataUsage.title'),
					content: t('privacy.dataUsage.content'),
				},
				{
					title: t('privacy.cookies.title'),
					content: t('privacy.cookies.content'),
				},
				{
					title: t('privacy.rights.title'),
					content: t('privacy.rights.content'),
				},
			],
		},
		terms: {
			title: t('terms.title'),
			sections: [
				{
					title: t('terms.general.title'),
					content: t('terms.general.content'),
				},
				{ title: t('terms.orders.title'), content: t('terms.orders.content') },
				{ title: t('terms.prices.title'), content: t('terms.prices.content') },
				{
					title: t('terms.shipping.title'),
					content: t('terms.shipping.content'),
				},
				{
					title: t('terms.returns.title'),
					content: t('terms.returns.content'),
				},
				{
					title: t('terms.liability.title'),
					content: t('terms.liability.content'),
				},
			],
		},
		imprint: {
			title: t('imprint.title'),
			sections: [
				{
					title: t('imprint.company.title'),
					content: t('imprint.company.content'),
				},
				{
					title: t('imprint.contact.title'),
					content: t('imprint.contact.content'),
				},
				{
					title: t('imprint.management.title'),
					content: t('imprint.management.content'),
				},
				{
					title: t('imprint.register.title'),
					content: t('imprint.register.content'),
				},
			],
		},
		vereinsatzung: {
			title: t('vereinsatzung.title'),
			subtitle: t('vereinsatzung.subtitle'),
			sections: [
				{
					title: t('vereinsatzung.section1.title'),
					content: t('vereinsatzung.section1.content'),
				},
				{
					title: t('vereinsatzung.section2.title'),
					content: t('vereinsatzung.section2.content'),
				},
				{
					title: t('vereinsatzung.section3.title'),
					content: t('vereinsatzung.section3.content'),
				},
				{
					title: t('vereinsatzung.section4.title'),
					content: t('vereinsatzung.section4.content'),
				},
				{
					title: t('vereinsatzung.section5.title'),
					content: t('vereinsatzung.section5.content'),
				},
				{
					title: t('vereinsatzung.section6.title'),
					content: t('vereinsatzung.section6.content'),
				},
				{
					title: t('vereinsatzung.section7.title'),
					content: t('vereinsatzung.section7.content'),
				},
				{
					title: t('vereinsatzung.section8.title'),
					content: t('vereinsatzung.section8.content'),
				},
				{
					title: t('vereinsatzung.section9.title'),
					content: t('vereinsatzung.section9.content'),
				},
			],
		},
	};

	const currentContent = content[type];

	return (
		<div className="w-full">
			{/* Header - nur auf Pages, nicht im Modal */}
			{showHeader && (
				<div className="mb-8 pb-6 border-b border-neutral-800">
					<h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
						{currentContent.title}
					</h1>
					{currentContent.subtitle && (
						<p className="text-neutral-400 mt-2 text-lg">
							{currentContent.subtitle}
						</p>
					)}
				</div>
			)}

			{/* Content Sections */}
			<div className={showHeader ? 'space-y-8' : 'space-y-6'}>
				{currentContent.sections.map((section, index) => (
					<div
						key={index}
						className={showHeader ? 'pb-6 border-b border-neutral-800 last:border-0' : ''}
					>
						<h2 className={showHeader
							? 'text-xl md:text-2xl font-semibold text-white mb-4'
							: 'text-lg font-semibold text-white mb-3'
						}>
							{section.title}
						</h2>
						<div className="text-neutral-300 leading-relaxed whitespace-pre-line">
							{section.content}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

