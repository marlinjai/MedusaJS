// legal-modal/index.tsx

'use client';

import {
	Dialog,
	DialogPanel,
	Transition,
	TransitionChild,
} from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';
import { BsX } from 'react-icons/bs';

type LegalModalProps = {
	isOpen: boolean;
	onClose: () => void;
	type: 'privacy' | 'terms' | 'imprint' | 'vereinsatzung';
};

export default function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
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
		<Transition show={isOpen} as={Fragment}>
			<Dialog as="div" className="relative z-[99999]" onClose={onClose}>
				{/* Backdrop */}
				<TransitionChild
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
				</TransitionChild>

				{/* Modal Container */}
				<div className="fixed inset-0 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4">
						<TransitionChild
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 scale-95 translate-y-8"
							enterTo="opacity-100 scale-100 translate-y-0"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 scale-100 translate-y-0"
							leaveTo="opacity-0 scale-95 translate-y-8"
						>
							<DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl transition-all relative">
								{/* Texture Background Overlay */}
								<div
									className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
									style={{
										backgroundImage: 'url(/images/texture_I.jpg)',
										backgroundSize: 'cover',
										backgroundPosition: 'center',
									}}
								/>

								{/* Content */}
								<div className="relative">
									{/* Header */}
									<div className="flex items-center justify-between p-8 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm">
										<div>
											<h2 className="text-2xl md:text-3xl font-bold text-white">
												{currentContent.title}
											</h2>
											{currentContent.subtitle && (
												<p className="text-neutral-400 mt-2">
													{currentContent.subtitle}
												</p>
											)}
										</div>
										<button
											onClick={onClose}
											className="p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
										>
											<BsX className="w-8 h-8" />
										</button>
									</div>

									{/* Content Sections */}
									<div className="p-8 max-h-[70vh] overflow-y-auto bg-neutral-900/95 backdrop-blur-sm">
										<div className="space-y-8">
											{currentContent.sections.map((section, index) => (
												<div key={index}>
													<h3 className="text-xl font-semibold text-white mb-4">
														{section.title}
													</h3>
													<div className="text-neutral-300 leading-relaxed whitespace-pre-line">
														{section.content}
													</div>
												</div>
											))}
										</div>
									</div>

									{/* Footer */}
									<div className="p-8 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-sm">
										<button
											onClick={onClose}
											className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg h-12 transition-colors"
										>
											{t('close')}
										</button>
									</div>
								</div>
							</DialogPanel>
						</TransitionChild>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
}
