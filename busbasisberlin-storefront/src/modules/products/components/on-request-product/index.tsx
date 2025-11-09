// on-request-product/index.tsx
// Displays a message and form for products that can only be ordered on request

'use client';

import { HttpTypes } from '@medusajs/types';
import { useState } from 'react';
import { FiInfo } from 'react-icons/fi';

type OnRequestProductProps = {
	product: HttpTypes.StoreProduct;
	customer?: HttpTypes.StoreCustomer | null;
};

export default function OnRequestProduct({
	product,
	customer,
}: OnRequestProductProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [isFormVisible, setIsFormVisible] = useState(false);
	const [formData, setFormData] = useState({
		email: customer?.email || '',
		name:
			customer?.first_name && customer?.last_name
				? `${customer.first_name} ${customer.last_name}`
				: '',
		phone: customer?.phone || '',
		address: '',
		city: '',
		postalCode: '',
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const backendUrl =
				process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
			const response = await fetch(`${backendUrl}/store/product-inquiry`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY}`,
				},
				body: JSON.stringify({
					product: {
						id: product.id,
						title: product.title,
						handle: product.handle,
					},
					customer: formData,
				}),
			});

			if (response.ok) {
				setIsSuccess(true);
				setFormData({
					email: customer?.email || '',
					name:
						customer?.first_name && customer?.last_name
							? `${customer.first_name} ${customer.last_name}`
							: '',
					phone: customer?.phone || '',
					address: '',
					city: '',
					postalCode: '',
					message: '',
				});
				setIsFormVisible(false);
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to send inquiry');
			}
		} catch (error: any) {
			console.error('Product inquiry error:', error);
			alert(
				error.message ||
					'Fehler beim Senden der Anfrage. Bitte versuchen Sie es erneut.',
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isSuccess) {
		return (
			<div className="px-6 py-8 bg-green-600/10 border border-green-600/20 rounded-lg text-center">
				<h3 className="text-lg font-semibold text-green-600 mb-2">
					Anfrage erfolgreich gesendet!
				</h3>
				<p className="text-sm text-muted-foreground mb-4">
					Wir melden uns innerhalb von 24 Stunden bei Ihnen mit weiteren
					Informationen.
				</p>
				<button
					onClick={() => {
						setIsSuccess(false);
						setIsFormVisible(false);
					}}
					className="w-full px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
				>
					Weitere Anfrage senden
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-y-4">
			{/* Info Box */}
			<div className="px-6 py-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
				<div className="flex items-start gap-3">
					<FiInfo className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
					<div className="flex-1">
						<h3 className="text-base font-semibold text-amber-900 dark:text-amber-100 mb-2">
							Artikel auf Anfrage
						</h3>
						<p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
							Dieser Artikel kann auf Anfrage bestellt werden. Da die Teile zu
							individuell sind, ist eine vorherige Besprechung notwendig. Bitte
							kontaktieren Sie uns für weitere Informationen und ein
							individuelles Angebot.
						</p>
					</div>
				</div>
			</div>

			{/* Collapsible Form */}
			<button
				onClick={() => setIsFormVisible(!isFormVisible)}
				className="px-6 py-4 bg-card border border-border rounded-lg text-left hover:bg-muted/50 transition-colors w-full"
			>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-base font-semibold text-foreground">
							Kontakt aufnehmen
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							Füllen Sie das Formular aus, um eine Anfrage zu senden
						</p>
					</div>
					<svg
						className={`w-5 h-5 text-foreground transition-transform duration-200 flex-shrink-0 ml-2 ${
							isFormVisible ? 'rotate-180' : ''
						}`}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</div>
			</button>

			{/* Form */}
			<div
				className={`overflow-hidden transition-all duration-300 ease-in-out ${
					isFormVisible ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
				}`}
			>
				<form
					onSubmit={handleSubmit}
					className="space-y-4 pt-2 px-6 py-4 bg-card border border-border rounded-lg"
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="name"
								className="block text-sm font-medium text-foreground mb-1"
							>
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
							<label
								htmlFor="email"
								className="block text-sm font-medium text-foreground mb-1"
							>
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
						<label
							htmlFor="phone"
							className="block text-sm font-medium text-foreground mb-1"
						>
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
						<label
							htmlFor="address"
							className="block text-sm font-medium text-foreground mb-1"
						>
							Adresse (optional)
						</label>
						<input
							type="text"
							id="address"
							name="address"
							value={formData.address}
							onChange={handleInputChange}
							className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-background text-foreground text-sm"
							placeholder="Straße und Hausnummer"
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="postalCode"
								className="block text-sm font-medium text-foreground mb-1"
							>
								PLZ (optional)
							</label>
							<input
								type="text"
								id="postalCode"
								name="postalCode"
								value={formData.postalCode}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-background text-foreground text-sm"
								placeholder="12345"
							/>
						</div>

						<div>
							<label
								htmlFor="city"
								className="block text-sm font-medium text-foreground mb-1"
							>
								Stadt (optional)
							</label>
							<input
								type="text"
								id="city"
								name="city"
								value={formData.city}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-background text-foreground text-sm"
								placeholder="Berlin"
							/>
						</div>
					</div>

					<div>
						<label
							htmlFor="message"
							className="block text-sm font-medium text-foreground mb-1"
						>
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

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
					>
						{isSubmitting ? 'Wird gesendet...' : 'Anfrage senden'}
					</button>
				</form>
			</div>
		</div>
	);
}
