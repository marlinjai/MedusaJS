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
import LegalContent from '../legal-content';

type LegalModalProps = {
	isOpen: boolean;
	onClose: () => void;
	type: 'privacy' | 'terms' | 'imprint' | 'vereinsatzung';
};

export default function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
	const t = useTranslations('legal');

	// Get title and subtitle for modal header
	const getTitle = () => {
		switch (type) {
			case 'privacy':
				return t('privacy.title');
			case 'terms':
				return t('terms.title');
			case 'imprint':
				return t('imprint.title');
			case 'vereinsatzung':
				return t('vereinsatzung.title');
		}
	};

	const getSubtitle = () => {
		if (type === 'vereinsatzung') {
			return t('vereinsatzung.subtitle');
		}
		return null;
	};

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
												{getTitle()}
											</h2>
											{getSubtitle() && (
												<p className="text-neutral-400 mt-2">
													{getSubtitle()}
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
										<LegalContent type={type} />
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
