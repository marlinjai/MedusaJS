// src/modules/home/components/image-section/index.tsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const ImageSection = () => {
	return (
		<section className="py-24 px-4 md:px-8">
			<div className="max-w-7xl mx-auto">
				{/* Section Header */}
				<div className="text-center mb-16">
					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent"
					>
						Handwerk mit Leidenschaft
					</motion.h2>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="text-neutral-400 max-w-2xl mx-auto"
					>
						Von der ersten Inspektion bis zur kompletten Restauration - wir
						arbeiten mit Präzision und Hingabe an jedem Fahrzeug
					</motion.p>
				</div>

				{/* Main Image Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
					{/* Left Side - Large Image with Text Overlay */}
					<motion.div
						initial={{ opacity: 0, x: -50 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6 }}
						className="relative h-96 lg:h-[500px] rounded-2xl overflow-hidden group"
					>
						<Image
							src="/images/Werkstattarbeiten_I.jpg"
							alt="Werkstattarbeiten bei BusBasis Berlin"
							fill
							className="object-cover transition-transform duration-700 group-hover:scale-105"
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
						<div className="absolute bottom-8 left-8 right-8">
							<h3 className="text-2xl font-bold text-white mb-3">
								Präzise Werkstattarbeit
							</h3>
							<p className="text-neutral-200 leading-relaxed">
								Jeder Handgriff sitzt. Mit modernster Ausrüstung und
								jahrzehntelanger Erfahrung sorgen wir für höchste Qualität bei
								allen Reparaturen und Umbauten.
							</p>
						</div>
					</motion.div>

					{/* Right Side - Two Smaller Images Stacked */}
					<div className="space-y-8">
						<motion.div
							initial={{ opacity: 0, x: 50 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="relative h-44 lg:h-60 rounded-2xl overflow-hidden group"
						>
							<Image
								src="/images/about/tools_IV.jpg"
								alt="Professionelle Werkzeuge"
								fill
								className="object-cover transition-transform duration-700 group-hover:scale-105"
							/>
							<div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
							<div className="absolute bottom-6 left-6">
								<h4 className="text-lg font-semibold text-white mb-2">
									Professionelle Ausrüstung
								</h4>
								<p className="text-neutral-200 text-sm">
									Das richtige Werkzeug für jeden Job
								</p>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, x: 50 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.4 }}
							className="relative h-44 lg:h-60 rounded-2xl overflow-hidden group"
						>
							<Image
								src="/images/We_dirt_our_Hands_I.jpg"
								alt="Detailarbeit mit den Händen"
								fill
								className="object-cover transition-transform duration-700 group-hover:scale-105 rotate-180"
							/>
							<div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
							<div className="absolute bottom-6 left-6">
								<h4 className="text-lg font-semibold text-white mb-2">
									Detailarbeit
								</h4>
								<p className="text-neutral-200 text-sm">
									Sorgfalt in jedem Detail
								</p>
							</div>
						</motion.div>
					</div>
				</div>

				{/* Bottom Section - Process Showcase */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.6 }}
					className="grid grid-cols-1 md:grid-cols-3 gap-6"
				>
					<div className="relative h-64 rounded-2xl overflow-hidden group">
						<Image
							src="/images/Arbeitsablauf_I.jpg"
							alt="Diagnose und Planung"
							fill
							className="object-cover transition-transform duration-700 group-hover:scale-105"
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
						<div className="absolute bottom-6 left-6 right-6">
							<div className="text-blue-400 text-sm font-medium mb-2">01</div>
							<h4 className="text-white font-semibold mb-2">
								Diagnose & Planung
							</h4>
							<p className="text-neutral-300 text-sm">
								Gründliche Analyse und individuelle Lösungskonzepte
							</p>
						</div>
					</div>

					<div className="relative h-64 rounded-2xl overflow-hidden group">
						<Image
							src="/images/Arbeitsablauf_II.jpg"
							alt="Präzise Umsetzung"
							fill
							className="object-cover transition-transform duration-700 group-hover:scale-105"
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
						<div className="absolute bottom-6 left-6 right-6">
							<div className="text-blue-400 text-sm font-medium mb-2">02</div>
							<h4 className="text-white font-semibold mb-2">
								Präzise Umsetzung
							</h4>
							<p className="text-neutral-300 text-sm">
								Fachgerechte Durchführung mit höchster Sorgfalt
							</p>
						</div>
					</div>

					<div className="relative h-64 rounded-2xl overflow-hidden group">
						<Image
							src="/images/Arbeitsablauf_III.jpg"
							alt="Qualitätskontrolle"
							fill
							className="object-cover transition-transform duration-700 group-hover:scale-105"
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
						<div className="absolute bottom-6 left-6 right-6">
							<div className="text-blue-400 text-sm font-medium mb-2">03</div>
							<h4 className="text-white font-semibold mb-2">
								Qualitätskontrolle
							</h4>
							<p className="text-neutral-300 text-sm">
								Abschließende Prüfung für perfekte Ergebnisse
							</p>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
};

export default ImageSection;
