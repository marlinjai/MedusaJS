// faq-section/index.tsx

'use client';

import { useEffect, useState } from 'react';

type FAQ = {
	question: string;
	answer: string;
};

type FAQData = {
	enabled: boolean;
	items: FAQ[];
};

export default function FAQSection() {
	const [faqs, setFaqs] = useState<FAQ[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [enabled, setEnabled] = useState(false);
	const [openIndex, setOpenIndex] = useState<number | null>(null);
	const [showAllMobile, setShowAllMobile] = useState(false);

	useEffect(() => {
		const fetchFAQSettings = async () => {
			try {
				const backendUrl =
					process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
				const response = await fetch(`${backendUrl}/public/settings`, {
					cache: 'no-store',
				});

				if (response.ok) {
					const data = await response.json();
					const faqData: FAQData = data.faq || { enabled: false, items: [] };
					setEnabled(faqData.enabled);
					setFaqs(faqData.items || []);
				} else {
					console.error('[FAQ-SECTION] Failed to load FAQ settings');
				}
			} catch (error) {
				console.error('[FAQ-SECTION] Error loading FAQ settings:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchFAQSettings();
	}, []);

	const toggleFAQ = (index: number) => {
		setOpenIndex(openIndex === index ? null : index);
	};

	// Don't render if disabled or loading
	if (isLoading) {
		return null;
	}

	if (!enabled || faqs.length === 0) {
		return null;
	}

	// Show first 3 FAQs on mobile initially
	const mobileFaqs = faqs.slice(0, 3);
	const remainingFaqs = faqs.slice(3);

	return (
		<section id="faq" className="w-full pt-40 pb-16 sm:pb-24 bg-background scroll-mt-24">
			<div className="content-container">
				{/* Header */}
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">
						Häufig gestellte Fragen
					</h2>
					<p className="text-lg sm:text-xl text-muted-foreground">
						Antworten auf die wichtigsten Fragen zu unserem Service
					</p>
				</div>

				{/* Mobile Layout - Show only first 3 FAQs initially */}
				<div className="lg:hidden space-y-4 max-w-4xl mx-auto">
					{mobileFaqs.map((faq, index) => (
						<div
							key={index}
							data-faq-index={index}
							className="border border-border rounded-lg overflow-hidden bg-card"
						>
							<button
								onClick={() => toggleFAQ(index)}
								className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-muted transition-colors duration-200"
							>
								<h3 className="text-base sm:text-lg font-semibold text-card-foreground pr-4">
									{faq.question}
								</h3>
								<span className="text-muted-foreground text-xl font-light flex-shrink-0">
									{openIndex === index ? '−' : '+'}
								</span>
							</button>
							{openIndex === index && (
								<div className="px-6 pb-4">
									<div className="border-t border-border pt-4">
										<p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
											{faq.answer}
										</p>
									</div>
								</div>
							)}
						</div>
					))}

					{!showAllMobile && (
						<div className="text-center mt-8">
							<button
								onClick={() => setShowAllMobile(true)}
								className="contrast-btn"
							>
								Mehr FAQs
							</button>
						</div>
					)}

					{showAllMobile && (
						<>
							<div className="space-y-4 mt-4">
								{remainingFaqs.map((faq, index) => (
									<div
										key={index + 3}
										className="border border-border rounded-lg overflow-hidden bg-card"
									>
										<button
											onClick={() => toggleFAQ(index + 3)}
											className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-muted transition-colors duration-200"
										>
											<h3 className="text-base sm:text-lg font-semibold text-card-foreground pr-4">
												{faq.question}
											</h3>
											<span className="text-muted-foreground text-xl font-light flex-shrink-0">
												{openIndex === index + 3 ? '−' : '+'}
											</span>
										</button>
										{openIndex === index + 3 && (
											<div className="px-6 pb-4">
												<div className="border-t border-border pt-4">
													<p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
														{faq.answer}
													</p>
												</div>
											</div>
										)}
									</div>
								))}
							</div>

							<div className="text-center mt-8">
								<button
									onClick={() => {
										const thirdFaqElement = document.querySelector(
											'[data-faq-index="2"]',
										);
										setShowAllMobile(false);
										setOpenIndex(null);

										if (thirdFaqElement) {
											setTimeout(() => {
												const rect = thirdFaqElement.getBoundingClientRect();
												const scrollTop = window.pageYOffset + rect.top - 120;
												window.scrollTo({
													top: scrollTop,
													behavior: 'smooth',
												});
											}, 100);
										}
									}}
									className="contrast-btn"
								>
									Weniger FAQs
								</button>
							</div>
						</>
					)}
				</div>

				{/* Desktop Layout - Show all FAQs */}
				<div className="hidden lg:block space-y-4 max-w-4xl mx-auto">
					{faqs.map((faq, index) => (
						<div
							key={index}
							className="border border-border rounded-lg overflow-hidden bg-card"
						>
							<button
								onClick={() => toggleFAQ(index)}
								className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-muted transition-colors duration-200"
							>
								<h3 className="text-base sm:text-lg font-semibold text-card-foreground pr-4">
									{faq.question}
								</h3>
								<span className="text-muted-foreground text-xl font-light flex-shrink-0">
									{openIndex === index ? '−' : '+'}
								</span>
							</button>
							{openIndex === index && (
								<div className="px-6 pb-4">
									<div className="border-t border-border pt-4">
										<p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
											{faq.answer}
										</p>
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
