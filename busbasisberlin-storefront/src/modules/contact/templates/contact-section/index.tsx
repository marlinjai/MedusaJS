// contact-section/index.tsx

'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function ContactSection() {
	const t = useTranslations('contact');
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
		message: '',
	});

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value,
		}));
	};

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
			const response = await fetch(`${backendUrl}/store/contact`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					customer: formData,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to submit contact form');
			}

			// Success - show success message and reset form
			alert(t('successMessage'));
			setFormData({ name: '', email: '', phone: '', message: '' });
		} catch (error: any) {
			console.error('Contact form error:', error);
			setSubmitError(error.message || t('errorMessage') || 'Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut.');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<section
			id="contact"
			className="pt-40 pb-16 md:pb-24 bg-muted -scroll-mt-8"
		>
			<div className="content-container">
				{/* Header Section */}
				<div className="text-center mb-16 md:mb-20">
					<h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">
						{t('title')}
					</h2>
					<p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
						{t('subtitle')}
						<br />
						{t('subtitleLine2')}
					</p>
				</div>

				{/* Main Content Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
					{/* Contact Form */}
					<div className="bg-card rounded-lg shadow-xl p-6 lg:p-10">
						<h3 className="text-xl sm:text-2xl font-semibold mb-6 text-card-foreground">
							{t('formTitle')}
						</h3>
						<form onSubmit={handleSubmit} className="space-y-5">
							<div>
								<label
									htmlFor="name"
									className="block text-sm font-medium text-muted-foreground mb-2"
								>
									{t('form.name')} *
								</label>
								<input
									type="text"
									id="name"
									name="name"
									value={formData.name}
									onChange={handleInputChange}
									required
									className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 bg-background text-foreground placeholder:text-muted-foreground"
									placeholder={t('form.namePlaceholder')}
								/>
							</div>

							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-muted-foreground mb-2"
								>
									{t('form.email')} *
								</label>
								<input
									type="email"
									id="email"
									name="email"
									value={formData.email}
									onChange={handleInputChange}
									required
									className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 bg-background text-foreground placeholder:text-muted-foreground"
									placeholder={t('form.emailPlaceholder')}
								/>
							</div>

							<div>
								<label
									htmlFor="phone"
									className="block text-sm font-medium text-muted-foreground mb-2"
								>
									{t('form.phone')}
								</label>
								<input
									type="tel"
									id="phone"
									name="phone"
									value={formData.phone}
									onChange={handleInputChange}
									className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 bg-background text-foreground placeholder:text-muted-foreground"
									placeholder={t('form.phonePlaceholder')}
								/>
							</div>

							<div>
								<label
									htmlFor="message"
									className="block text-sm font-medium text-muted-foreground mb-2"
								>
									{t('form.message')} *
								</label>
								<textarea
									id="message"
									name="message"
									value={formData.message}
									onChange={handleInputChange}
									required
									rows={6}
									className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 bg-background text-foreground resize-none placeholder:text-muted-foreground"
									placeholder={t('form.messagePlaceholder')}
								/>
							</div>

							{submitError && (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
									{submitError}
								</div>
							)}
							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full sm:w-auto contrast-btn disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSubmitting ? t('submitting') || 'Wird gesendet...' : t('submitButton')}
							</button>
						</form>
					</div>

					{/* Location Section */}
					<div className="flex flex-col justify-between bg-card rounded-lg shadow-xl p-6 lg:p-10">
						<div>
							<h3 className="text-2xl font-semibold mb-6 text-card-foreground">
								{t('locationTitle')}
							</h3>
							<div className="space-y-6">
								<div>
									<label className="block text-base sm:text-lg font-medium text-muted-foreground mb-3">
										{t('locationLabel')}
									</label>
									<div className="px-4 py-3 border border-border rounded-lg bg-muted">
										<p className="text-muted-foreground mb-3">
											{t('locationDescription')}
										</p>
										<p className="text-lg font-semibold text-foreground mb-2">
											Basis Camp Berlin GmbH
										</p>
										<p className="text-muted-foreground">
											Hauptstrasse 51
											<br />
											16547 Birkenwerder
										</p>
									</div>
								</div>

								<div>
									<label className="block text-base sm:text-lg font-medium text-muted-foreground mb-3">
										{t('contactLabel')}
									</label>
									<div className="px-4 py-3 border border-border rounded-lg bg-muted">
										<div className="space-y-3 text-muted-foreground">
											<div className="flex items-start gap-2">
												<span className="font-semibold text-foreground">
													E-Mail:
												</span>
												<a
													href="mailto:info@basiscampberlin.de"
													className="text-primary hover:underline"
												>
													info@basiscampberlin.de
												</a>
											</div>
											<div className="text-sm text-muted-foreground leading-relaxed">
												{t('phoneNote')}
											</div>
										</div>
									</div>
								</div>

								<div>
									<label className="block text-base sm:text-lg font-medium text-muted-foreground mb-3">
										{t('openingHoursLabel')}
									</label>
									<div className="px-4 py-3 border border-border rounded-lg bg-muted">
										<div className="space-y-2 text-muted-foreground text-sm">
											<div className="flex justify-between">
												<span>{t('mondayFriday')}</span>
												<span className="font-semibold text-foreground">
													08:00–16:00
												</span>
											</div>
											<div className="flex justify-between">
												<span>{t('saturdaySunday')}</span>
												<span className="font-semibold text-foreground">
													{t('closed')}
												</span>
											</div>
										</div>
									</div>
								</div>

								<div>
									<label className="block text-base sm:text-lg font-medium text-muted-foreground mb-3">
										{t('mapLabel')}
									</label>
									<div className="h-[300px] sm:h-[350px] rounded-lg overflow-hidden">
										<iframe
											src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2424.2876453221384!2d13.276584476632358!3d52.678856672058595!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a85f9e5e5e5e5e%3A0x5e5e5e5e5e5e5e5e!2sHauptstrasse%2051%2C%2016547%20Birkenwerder%2C%20Germany!5e0!3m2!1sen!2sde!4v1730312000000!5m2!1sen!2sde"
											width="100%"
											height="100%"
											style={{ border: 0 }}
											allowFullScreen
											loading="lazy"
											referrerPolicy="no-referrer-when-downgrade"
											title="Workshop Location Map - Hauptstrasse 51, Birkenwerder"
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
