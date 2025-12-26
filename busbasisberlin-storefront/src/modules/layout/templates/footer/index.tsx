// footer/index.tsx

'use client';

import LocalizedClientLink from '@modules/common/components/localized-client-link';
import LegalModal from '@modules/layout/components/legal-modal';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa';
import { FiMapPin, FiPhone } from 'react-icons/fi';
import { MdOutlineMail } from 'react-icons/md';

// Footer accordion for mobile - Navigation
const NavigationAccordion = ({ title }: { title: string }) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="border-b border-border">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex justify-between items-center py-4 text-left"
			>
				<span className="text-lg font-semibold text-foreground">{title}</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className={`w-6 h-6 text-foreground transition-transform duration-300 ${
						isOpen ? 'rotate-180' : ''
					}`}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d={isOpen ? 'M18 12H6' : 'M12 6v12m6-6H6'}
					/>
				</svg>
			</button>
			<div
				className="overflow-hidden transition-all duration-300 ease-in-out"
				style={{ maxHeight: isOpen ? '500px' : '0' }}
			>
				<ul className="pb-4 space-y-3 px-2">
					<li>
						<LocalizedClientLink
							href="/store"
							className="text-muted-foreground hover:text-foreground transition-colors"
						>
							Shop
						</LocalizedClientLink>
					</li>
					<li>
						<LocalizedClientLink
							href="/#services"
							className="text-muted-foreground hover:text-foreground transition-colors"
						>
							Über uns
						</LocalizedClientLink>
					</li>
					<li>
						<LocalizedClientLink
							href="/#verein"
							className="text-muted-foreground hover:text-foreground transition-colors"
						>
							Verein
						</LocalizedClientLink>
					</li>
					<li>
						<LocalizedClientLink
							href="/#contact"
							className="text-muted-foreground hover:text-foreground transition-colors"
						>
							Kontakt
						</LocalizedClientLink>
					</li>
				</ul>
			</div>
		</div>
	);
};

// Footer accordion for mobile - Contact Section
const ContactAccordion = ({ title }: { title: string }) => {
	const t = useTranslations('footer');
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="border-b border-border">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex justify-between items-center py-4 text-left"
			>
				<span className="text-lg font-semibold text-foreground">{title}</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className={`w-6 h-6 text-foreground transition-transform duration-300 ${
						isOpen ? 'rotate-180' : ''
					}`}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d={isOpen ? 'M18 12H6' : 'M12 6v12m6-6H6'}
					/>
				</svg>
			</button>
			<div
				className="overflow-hidden transition-all duration-300 ease-in-out"
				style={{ maxHeight: isOpen ? '500px' : '0' }}
			>
				<ul className="pb-4 space-y-4 px-2">
					<li>
						<a
							href="mailto:info@basiscampberlin.de"
							className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
						>
							<MdOutlineMail className="w-5 h-5 flex-shrink-0" />
							<span>info@basiscampberlin.de</span>
						</a>
					</li>
					<li className="flex items-start gap-3 text-muted-foreground">
						<FiMapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
						<span>
							BCB GmbH
							<br />
							Hauptstraße 51
							<br />
							16547 Birkenwerder
						</span>
					</li>
					<li className="flex items-start gap-3 text-muted-foreground">
						<FiPhone className="w-5 h-5 flex-shrink-0 mt-0.5" />
						<span className="leading-relaxed">
							{t('phoneNote')}
						</span>
					</li>
				</ul>
			</div>
		</div>
	);
};

// Footer accordion for mobile - Legal Section
const LegalAccordion = ({
	title,
	onPrivacyClick,
	onTermsClick,
	onImprintClick,
	onVereinsatzungClick,
	vereinsatzungLabel,
}: {
	title: string;
	onPrivacyClick: () => void;
	onTermsClick: () => void;
	onImprintClick: () => void;
	onVereinsatzungClick: () => void;
	vereinsatzungLabel: string;
}) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="border-b border-border">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex justify-between items-center py-4 text-left"
			>
				<span className="text-lg font-semibold text-foreground">{title}</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className={`w-6 h-6 text-foreground transition-transform duration-300 ${
						isOpen ? 'rotate-180' : ''
					}`}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d={isOpen ? 'M18 12H6' : 'M12 6v12m6-6H6'}
					/>
				</svg>
			</button>
			<div
				className="overflow-hidden transition-all duration-300 ease-in-out"
				style={{ maxHeight: isOpen ? '500px' : '0' }}
			>
				<ul className="pb-4 space-y-3 px-2">
					<li>
						<button
							onClick={onPrivacyClick}
							className="text-muted-foreground hover:text-foreground transition-colors text-left"
						>
							Datenschutz
						</button>
					</li>
					<li>
						<button
							onClick={onTermsClick}
							className="text-muted-foreground hover:text-foreground transition-colors text-left"
						>
							AGB
						</button>
					</li>
					<li>
						<button
							onClick={onImprintClick}
							className="text-muted-foreground hover:text-foreground transition-colors text-left"
						>
							Impressum
						</button>
					</li>
					<li>
						<button
							onClick={onVereinsatzungClick}
							className="text-muted-foreground hover:text-foreground transition-colors text-left"
						>
							{vereinsatzungLabel}
						</button>
					</li>
				</ul>
			</div>
		</div>
	);
};

export default function Footer() {
	const t = useTranslations('footer');
	const currentYear = new Date().getFullYear();
	const [modalOpen, setModalOpen] = useState<
		'privacy' | 'terms' | 'imprint' | 'vereinsatzung' | null
	>(null);

	return (
		<footer
			className="bg-stone-950 border-t border-border w-full relative"
			aria-labelledby="footer-heading"
		>
			<h2 id="footer-heading" className="sr-only">
				Footer
			</h2>

			<div className="content-container py-12 sm:py-16">
				{/* Brand Section & Opening Hours */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 pb-8 border-b border-border">
					<div className="mb-8 md:mb-0">
						<LocalizedClientLink
							href="/"
							className="text-2xl font-bold text-foreground hover:text-primary transition-colors"
						>
							{t('companyName')}
						</LocalizedClientLink>
						<p className="mt-4 text-muted-foreground text-sm leading-relaxed max-w-xl">
							{t('description')}
						</p>

						{/* Social Links - Commented out for now */}
						{/* <div className="flex gap-4 mt-6">
							<a
								href="#"
								className="text-muted-foreground hover:text-foreground transition-colors"
								aria-label="Facebook"
							>
								<FaFacebook className="w-5 h-5" />
							</a>
							<a
								href="#"
								className="text-muted-foreground hover:text-foreground transition-colors"
								aria-label="Instagram"
							>
								<FaInstagram className="w-5 h-5" />
							</a>
							<a
								href="#"
								className="text-muted-foreground hover:text-foreground transition-colors"
								aria-label="LinkedIn"
							>
								<FaLinkedin className="w-5 h-5" />
							</a>
						</div> */}
					</div>

				{/* Opening Hours */}
				<div className="md:text-right">
					<h3 className="text-lg font-semibold text-foreground mb-4">
						{t('openingHours')}
					</h3>
						<div className="space-y-2 text-sm text-muted-foreground">
							<div className="flex md:justify-end gap-3">
								<span>{t('mondayFriday')}</span>
								<span className="text-foreground font-semibold">
									08:00–16:00
								</span>
							</div>
							<div className="flex md:justify-end gap-3">
								<span>{t('saturdaySunday')}</span>
								<span className="text-foreground font-semibold">
									{t('closed')}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Main footer content */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 pb-8">
					{/* Column 1: Navigation - Desktop only */}
					<div className="hidden md:block">
						<h3 className="text-lg font-semibold text-foreground mb-4">
							{t('navigation')}
						</h3>
						<ul className="space-y-3">
							<li>
								<LocalizedClientLink
									href="/store"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Shop
								</LocalizedClientLink>
							</li>
							<li>
								<LocalizedClientLink
									href="/#services"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Über uns
								</LocalizedClientLink>
							</li>
							<li>
								<LocalizedClientLink
									href="/#verein"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Verein
								</LocalizedClientLink>
							</li>
							<li>
								<LocalizedClientLink
									href="/#contact"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Kontakt
								</LocalizedClientLink>
							</li>
						</ul>
					</div>

					{/* Column 2: Legal - Desktop only */}
					<div className="hidden md:block">
						<h3 className="text-lg font-semibold text-foreground mb-4">
							{t('legal')}
						</h3>
						<ul className="space-y-3">
							<li>
								<button
									onClick={() => setModalOpen('privacy')}
									className="text-muted-foreground hover:text-foreground transition-colors text-left"
								>
									{t('privacy')}
								</button>
							</li>
							<li>
								<button
									onClick={() => setModalOpen('terms')}
									className="text-muted-foreground hover:text-foreground transition-colors text-left"
								>
									{t('terms')}
								</button>
							</li>
							<li>
								<button
									onClick={() => setModalOpen('imprint')}
									className="text-muted-foreground hover:text-foreground transition-colors text-left"
								>
									{t('imprint')}
								</button>
							</li>
							<li>
								<button
									onClick={() => setModalOpen('vereinsatzung')}
									className="text-muted-foreground hover:text-foreground transition-colors text-left"
								>
									{t('vereinsatzung')}
								</button>
							</li>
							<li>
								<LocalizedClientLink
									href="/#faq"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									FAQ
								</LocalizedClientLink>
							</li>
						</ul>
					</div>

					{/* Column 3: Contact Info - Desktop only */}
					<div className="hidden md:block">
						<h3 className="text-lg font-semibold text-foreground mb-4">
							{t('contact')}
						</h3>
						<ul className="space-y-4">
							<li>
								<a
									href="mailto:info@basiscampberlin.de"
									className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
								>
									<MdOutlineMail className="w-5 h-5 flex-shrink-0" />
									<span>info@basiscampberlin.de</span>
								</a>
							</li>
							<li className="flex items-start gap-3 text-muted-foreground">
								<FiMapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
								<span>
									BCB GmbH
									<br />
									Hauptstraße 51
									<br />
									16547 Birkenwerder
								</span>
							</li>
							<li className="flex items-start gap-3 text-muted-foreground">
								<FiPhone className="w-5 h-5 flex-shrink-0 mt-0.5" />
								<span className="leading-relaxed">
									{t('phoneNote')}
								</span>
							</li>
						</ul>
					</div>

					{/* Mobile Accordions */}
					<div className="md:hidden space-y-0">
						<NavigationAccordion title={t('navigation')} />
						<ContactAccordion title={t('contact')} />
						<LegalAccordion
							title={t('legal')}
							onPrivacyClick={() => setModalOpen('privacy')}
							onTermsClick={() => setModalOpen('terms')}
							onImprintClick={() => setModalOpen('imprint')}
							onVereinsatzungClick={() => setModalOpen('vereinsatzung')}
							vereinsatzungLabel={t('vereinsatzung')}
						/>
					</div>
				</div>

				{/* Bottom section */}
				<div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
					<p className="text-sm text-muted-foreground text-center sm:text-left">
						&copy; {currentYear} Basis Camp Berlin GmbH. {t('rights')}
					</p>
					<div className="flex gap-4 text-sm">
						<button
							onClick={() => setModalOpen('privacy')}
							className="text-muted-foreground hover:text-foreground transition-colors underline"
						>
							{t('privacy')}
						</button>
						<button
							onClick={() => setModalOpen('terms')}
							className="text-muted-foreground hover:text-foreground transition-colors underline"
						>
							{t('terms')}
						</button>
						<button
							onClick={() => setModalOpen('imprint')}
							className="text-muted-foreground hover:text-foreground transition-colors underline"
						>
							{t('imprint')}
						</button>
						<button
							onClick={() => setModalOpen('vereinsatzung')}
							className="text-muted-foreground hover:text-foreground transition-colors underline"
						>
							{t('vereinsatzung')}
						</button>
					</div>
				</div>
			</div>

			{/* Legal Modals */}
			{modalOpen && (
				<LegalModal
					isOpen={modalOpen !== null}
					onClose={() => setModalOpen(null)}
					type={modalOpen}
				/>
			)}
		</footer>
	);
}
