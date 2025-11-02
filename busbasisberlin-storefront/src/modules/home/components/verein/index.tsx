// src/modules/home/components/verein/index.tsx
'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { BsCalendarEvent, BsEnvelope, BsPeople, BsTools } from 'react-icons/bs';

const Verein = () => {
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
		address: '',
		vehicle: '',
		message: '',
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Hier würde die Formular-Logik implementiert werden
		console.log('Vereinsantrag:', formData);
		alert('Vielen Dank für Ihr Interesse! Wir melden uns bei Ihnen.');
	};

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	return (
		<section
			id="verein"
			className="pt-40 pb-24 px-4 md:px-8 bg-gradient-to-b from-neutral-900 to-black -scroll-mt-8"
		>
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="text-center mb-16">
					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent"
					>
						Birkenwerder Klassische Fahrzeuge e.V.
					</motion.h2>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="text-neutral-400 max-w-3xl mx-auto text-lg"
					>
						Herzlich willkommen in unserem Verein! Wir beschäftigen uns mit der
						Pflege und Instandhaltung älterer selbstausgebauter Mercedes
						Transporter und LKW's.
					</motion.p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
					{/* Vereinsinfo */}
					<motion.div
						initial={{ opacity: 0, x: -50 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6 }}
						className="space-y-8"
					>
						<div className="bg-neutral-800/50 p-8 rounded-2xl border border-neutral-700">
							<div className="flex items-center gap-3 mb-6">
								<BsPeople className="w-8 h-8 text-blue-400" />
								<h3 className="text-2xl font-semibold text-white">
									Unser Verein
								</h3>
							</div>
							<div className="space-y-4 text-neutral-300">
								<p>
									Unser kleiner Verein beschäftigt sich mit der Pflege und
									Instandhaltung älterer selbstausgebauter Mercedes Transporter
									und LKW's. Dabei liegt unser Schwerpunkt auf den
									Transporterbaureihen TL ("Bremer") und T2/L
									("Düsseldorfer"/Düdos).
								</p>
								<p>
									Die meisten unserer Vereinsmitglieder besitzen ein älteres
									Wohnmobil, meist einen selbstausgebauten Kastenwagen oder
									Koffer der o. g. Baureihen. An denen gibt es immer etwas zu
									tun.
								</p>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700">
								<div className="flex items-center gap-3 mb-4">
									<BsTools className="w-6 h-6 text-blue-400" />
									<h4 className="text-lg font-semibold text-white">
										Stellplätze
									</h4>
								</div>
								<p className="text-neutral-300 text-sm">
									Wir bieten nach Absprache und in enger Zusammenarbeit mit der
									Firma BusBasis Stellplätze und Selbstschrauberplätze an.
								</p>
							</div>

							<div className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700">
								<div className="flex items-center gap-3 mb-4">
									<BsCalendarEvent className="w-6 h-6 text-blue-400" />
									<h4 className="text-lg font-semibold text-white">Events</h4>
								</div>
								<p className="text-neutral-300 text-sm">
									In unregelmäßigen Abständen finden Schrauberevents, Ausfahrten
									und Vereinsfeste statt.
								</p>
							</div>
						</div>

						<div className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700">
							<div className="flex items-center gap-3 mb-4">
								<BsEnvelope className="w-6 h-6 text-blue-400" />
								<h4 className="text-lg font-semibold text-white">Kontakt</h4>
							</div>
							<p className="text-neutral-300 text-sm mb-2">
								Telefonisch sind wir leider nicht so gut zu erreichen, dafür
								aber sehr zuverlässig über E-Mail:
							</p>
							<a
								href="mailto:klassische-wohnmobile@gmx.de"
								className="text-blue-400 hover:text-blue-300 transition-colors"
							>
								klassische-wohnmobile@gmx.de
							</a>
						</div>
					</motion.div>

					{/* Mitgliedschaftsantrag */}
					<motion.div
						initial={{ opacity: 0, x: 50 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="bg-neutral-800/50 p-8 rounded-2xl border border-neutral-700"
					>
						<h3 className="text-2xl font-semibold text-white mb-6">
							Mitgliedschaft beantragen
						</h3>
						<p className="text-neutral-400 mb-8">
							Die Mitgliedschaft kann über dieses Formular beantragt werden. Wir
							melden uns zeitnah bei Ihnen zurück.
						</p>

						<form onSubmit={handleSubmit} className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label
										htmlFor="name"
										className="block text-sm font-medium text-neutral-300 mb-2"
									>
										Name *
									</label>
									<input
										type="text"
										id="name"
										name="name"
										required
										value={formData.name}
										onChange={handleChange}
										className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder="Ihr vollständiger Name"
									/>
								</div>

								<div>
									<label
										htmlFor="email"
										className="block text-sm font-medium text-neutral-300 mb-2"
									>
										E-Mail *
									</label>
									<input
										type="email"
										id="email"
										name="email"
										required
										value={formData.email}
										onChange={handleChange}
										className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder="ihre@email.de"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label
										htmlFor="phone"
										className="block text-sm font-medium text-neutral-300 mb-2"
									>
										Telefon
									</label>
									<input
										type="tel"
										id="phone"
										name="phone"
										value={formData.phone}
										onChange={handleChange}
										className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder="Ihre Telefonnummer"
									/>
								</div>

								<div>
									<label
										htmlFor="vehicle"
										className="block text-sm font-medium text-neutral-300 mb-2"
									>
										Fahrzeug
									</label>
									<input
										type="text"
										id="vehicle"
										name="vehicle"
										value={formData.vehicle}
										onChange={handleChange}
										className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder="z.B. Mercedes T2 Düdo 408"
									/>
								</div>
							</div>

							<div>
								<label
									htmlFor="address"
									className="block text-sm font-medium text-neutral-300 mb-2"
								>
									Adresse
								</label>
								<input
									type="text"
									id="address"
									name="address"
									value={formData.address}
									onChange={handleChange}
									className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="Straße, PLZ Ort"
								/>
							</div>

							<div>
								<label
									htmlFor="message"
									className="block text-sm font-medium text-neutral-300 mb-2"
								>
									Nachricht
								</label>
								<textarea
									id="message"
									name="message"
									rows={4}
									value={formData.message}
									onChange={handleChange}
									className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="Erzählen Sie uns von Ihrem Fahrzeug oder stellen Sie Fragen..."
								/>
							</div>

							<button
								type="submit"
								className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
							>
								Mitgliedschaftsantrag senden
							</button>
						</form>

						<p className="text-neutral-500 text-xs mt-4">
							* Pflichtfelder. Ihre Daten werden vertraulich behandelt und nur
							für die Vereinsmitgliedschaft verwendet.
						</p>
					</motion.div>
				</div>
			</div>
		</section>
	);
};

export default Verein;
