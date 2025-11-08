// quote-request/index.tsx

'use client';

import { HttpTypes } from '@medusajs/types';
import { Button } from '@medusajs/ui';
import { useState } from 'react';

type QuoteRequestProps = {
	product: HttpTypes.StoreProduct;
	variant?: HttpTypes.StoreProductVariant;
	customer?: HttpTypes.StoreCustomer | null;
};

export default function QuoteRequest({ product, variant, customer }: QuoteRequestProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [isFormVisible, setIsFormVisible] = useState(false);
	const [formData, setFormData] = useState({
		email: customer?.email || '',
		name: customer?.first_name && customer?.last_name
			? `${customer.first_name} ${customer.last_name}`
			: '',
		phone: customer?.phone || '',
		address: '',
		city: '',
		postalCode: '',
		message: '',
	});

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value,
		}));
	};

	const [submitError, setSubmitError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
			const response = await fetch(`${backendUrl}/store/quote-request`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					product: {
						id: product.id,
						title: product.title,
						handle: product.handle,
						variantId: variant?.id,
					},
					customer: formData,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to send quote request');
			}

			// Success - show success message and reset form
			setIsSuccess(true);
			setFormData({
				email: customer?.email || '',
				name: customer?.first_name && customer?.last_name
					? `${customer.first_name} ${customer.last_name}`
					: '',
				phone: customer?.phone || '',
				address: '',
				city: '',
				postalCode: '',
				message: '',
			});
			setIsFormVisible(false);
		} catch (error: any) {
			console.error('Quote request error:', error);
			setSubmitError(error.message || 'Fehler beim Senden der Anfrage. Bitte versuchen Sie es erneut.');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isSuccess) {
		return (
			<div className="px-6 py-8 bg-green-600/10 border border-green-600/20 rounded-lg text-center">
				<h3 className="text-lg font-semibold text-green-600 mb-2">Anfrage erfolgreich gesendet!</h3>
				<p className="text-sm text-muted-foreground mb-4">
					Wir melden uns innerhalb von 24 Stunden bei Ihnen mit einem Versandangebot.
				</p>
				<button
					onClick={() => setIsSuccess(false)}
					className="w-full px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
				>
					Weitere Anfrage senden
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-y-4">
			{/* Collapsible Info Box */}
			<button
				onClick={() => setIsFormVisible(!isFormVisible)}
				className="px-4 py-3 bg-blue-600/10 border border-blue-600/20 rounded-lg text-left hover:bg-blue-600/15 transition-colors w-full"
			>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm text-blue-600 font-medium">
							⚠️ Sperrgut - Versandkosten auf Anfrage
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							Aufgrund der Größe/Gewicht müssen wir die Versandkosten individuell berechnen.
						</p>
					</div>
					<svg
						className={`w-5 h-5 text-blue-600 transition-transform duration-200 flex-shrink-0 ml-2 ${
							isFormVisible ? 'rotate-180' : ''
						}`}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</div>
			</button>

			{/* Collapsible Form */}
			<div
				className={`overflow-hidden transition-all duration-300 ease-in-out ${
					isFormVisible ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
				}`}
			>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
							Name *
						</label>
						<input
							type="text"
							id="name"
							name="name"
							value={formData.name}
							onChange={handleInputChange}
							required
							disabled={!!customer}
							className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-background text-foreground text-sm disabled:opacity-50"
							placeholder="Ihr Name"
						/>
					</div>

					<div>
						<label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
							E-Mail *
						</label>
						<input
							type="email"
							id="email"
							name="email"
							value={formData.email}
							onChange={handleInputChange}
							required
							disabled={!!customer}
							className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-background text-foreground text-sm disabled:opacity-50"
							placeholder="ihre.email@beispiel.de"
						/>
					</div>
				</div>

				<div>
					<label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
						Telefon (optional)
					</label>
					<input
						type="tel"
						id="phone"
						name="phone"
						value={formData.phone}
						onChange={handleInputChange}
						className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-background text-foreground text-sm"
						placeholder="Ihre Telefonnummer"
					/>
				</div>

				<div>
					<label htmlFor="address" className="block text-sm font-medium text-foreground mb-1">
						Lieferadresse *
					</label>
					<input
						type="text"
						id="address"
						name="address"
						value={formData.address}
						onChange={handleInputChange}
						required
						className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-background text-foreground text-sm"
						placeholder="Straße und Hausnummer"
					/>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label htmlFor="postalCode" className="block text-sm font-medium text-foreground mb-1">
							PLZ *
						</label>
						<input
							type="text"
							id="postalCode"
							name="postalCode"
							value={formData.postalCode}
							onChange={handleInputChange}
							required
							className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-background text-foreground text-sm"
							placeholder="12345"
						/>
					</div>

					<div>
						<label htmlFor="city" className="block text-sm font-medium text-foreground mb-1">
							Stadt *
						</label>
						<input
							type="text"
							id="city"
							name="city"
							value={formData.city}
							onChange={handleInputChange}
							required
							className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-background text-foreground text-sm"
							placeholder="Berlin"
						/>
					</div>
				</div>

				<div>
					<label htmlFor="message" className="block text-sm font-medium text-foreground mb-1">
						Nachricht (optional)
					</label>
					<textarea
						id="message"
						name="message"
						value={formData.message}
						onChange={handleInputChange}
						rows={3}
						className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-background text-foreground resize-none text-sm"
						placeholder="Besondere Wünsche oder Anmerkungen..."
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
						className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
					>
						{isSubmitting ? 'Wird gesendet...' : 'Versandkosten anfragen'}
					</button>
				</form>
			</div>
		</div>
	);
}

