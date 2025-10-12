'use client';

import { motion } from 'framer-motion';
import { BsBox, BsBuildingGear, BsTools } from 'react-icons/bs';

const services = [
	{
		icon: <BsBuildingGear className="w-8 h-8" />,
		title: 'Reparatur, Restauration & HU',
		description:
			"Spezialwerkstatt für Mercedes-Transporter der Düsseldorfer Baureihe. Seit Jahren beschäftigen wir uns mit dem Erhalt alter Mercedes Transporter, insbesondere des liebevoll 'Düdo' genannten T2.",
		features: [
			'Düsseldorfer Baureihen (406, 407, 408, 409, 508, 608, 613)',
			'Bremer und Vario Nachfolgemodelle',
			'Motorwechsel OM616 auf OM314',
			'HU-Abnahme und H-Kennzeichen',
			'Technische Änderungen & Fahrzeugpapiere',
			'Gasprüfung und Wohnmobiltechnik',
		],
	},
	{
		icon: <BsTools className="w-8 h-8" />,
		title: 'Wohnmobile & Expeditionsfahrzeuge',
		description:
			'Die meisten Düdos werden heute als Wohnmobil genutzt. Wir bieten Beratung, Planung und Konzeption Ihres Wunschfahrzeugs - von einzelnen Bauteilen bis zum kompletten Fahrzeug.',
		features: [
			'Beratung und Fahrzeugkonzeption',
			'Standheizung und Gasinstallation',
			'Individuelle Raumkonzepte',
			'Spezialanfertigungen (neues Dach, 6-Zyl. Diesel)',
			'Komplette Aufbauten',
			'Wohnmobiltechnik-Instandsetzung',
		],
	},
	{
		icon: <BsBox className="w-8 h-8" />,
		title: 'Ersatzteile & Fahrzeugbeschaffung',
		description:
			'Unser Ziel ist es, stets die Möglichkeit zu bieten, die alten Transporter fahrbar zu machen. Großes Ersatzteillager mit gebrauchten und neuen Teilen im Onlineshop.',
		features: [
			'Düdo-Spezialisierung (T2/L)',
			"Mercedes T1 'Bremer' Teile",
			'Vario-Ersatzteile',
			'Onlineshop verfügbar',
			'Spezialteile auf Anfrage',
			'Vor-Ort Einkauf möglich',
		],
	},
];

const ServiceCard = ({ service, index }: { service: any; index: number }) => {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: index * 0.2 }}
			className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all duration-300"
		>
			<div className="mb-6 p-3 bg-blue-500/10 w-fit rounded-xl text-blue-400">
				{service.icon}
			</div>
			<h3 className="text-xl font-semibold mb-4 text-white">{service.title}</h3>
			<p className="text-neutral-400 mb-6">{service.description}</p>
			<ul className="space-y-3">
				{service.features.map((feature: string, idx: number) => (
					<li key={idx} className="flex items-center text-neutral-300">
						<span className="mr-2 text-blue-400">•</span>
						{feature}
					</li>
				))}
			</ul>
		</motion.div>
	);
};

export default function Services() {
	return (
		<section id="services" className="py-24 px-4 md:px-8 scroll-mt-24">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-16">
					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent"
					>
						Unsere Dienstleistungen
					</motion.h2>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="text-neutral-400 max-w-2xl mx-auto"
					>
						Es gibt nichts, was wir an Düsseldorfern noch nicht gemacht haben.
						Spezialisiert auf Mercedes T2 "Düdos" und deren Nachfolger.
					</motion.p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{services.map((service, index) => (
						<ServiceCard key={index} service={service} index={index} />
					))}
				</div>
			</div>
		</section>
	);
}
