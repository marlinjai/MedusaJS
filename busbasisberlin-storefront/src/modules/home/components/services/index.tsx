// services/index.tsx

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { BsBox, BsBuildingGear, BsTools } from 'react-icons/bs';

const ServiceCard = ({
	icon,
	titleKey,
	descKey,
	featureKeys,
	index,
}: {
	icon: React.ReactNode;
	titleKey: string;
	descKey: string;
	featureKeys: string[];
	index: number;
}) => {
	const t = useTranslations('services');

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: index * 0.2 }}
			whileHover={{ y: -4 }}
			className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/80 transition-all duration-300 cursor-pointer group"
		>
			<div className="mb-6 p-3 bg-blue-500/10 w-fit rounded-xl text-blue-400 group-hover:bg-blue-500/20 transition-colors duration-300">
				{icon}
			</div>
			<h3 className="text-xl font-semibold mb-6 text-white group-hover:text-blue-400 transition-colors duration-300">
				{t(titleKey as any)}
			</h3>
			<ul className="space-y-3">
				{featureKeys.map((featureKey: string, idx: number) => (
					<li
						key={idx}
						className="flex items-start text-neutral-300 group-hover:text-neutral-200 transition-colors duration-300"
					>
						<span className="mr-2 text-blue-400 mt-1">•</span>
						<span>{t(featureKey as any)}</span>
					</li>
				))}
			</ul>
		</motion.div>
	);
};

export default function Services() {
	const t = useTranslations('services');

	const services = [
		{
			icon: <BsTools className="w-8 h-8" />,
			titleKey: 'camperVans.title',
			descKey: 'camperVans.description',
			featureKeys: [
				'camperVans.features.planning',
				'camperVans.features.parts',
				'camperVans.features.tech',
				'camperVans.features.custom',
			],
		},
		{
			icon: <BsBuildingGear className="w-8 h-8" />,
			titleKey: 'repair.title',
			descKey: 'repair.description',
			featureKeys: [
				'repair.features.expertise',
				'repair.features.models',
				'repair.features.engine',
				'repair.features.maintenance',
				'repair.features.inspection',
			],
		},
		{
			icon: <BsBox className="w-8 h-8" />,
			titleKey: 'parts.title',
			descKey: 'parts.description',
			featureKeys: [
				'parts.features.warehouse',
				'parts.features.online',
				'parts.features.special',
				'parts.features.local',
				'parts.features.procurement',
			],
		},
	];

	return (
		<section id="services" className="pt-40 pb-24 px-4 md:px-8 scroll-mt-24">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-20">
					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent"
					>
						{t('title')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="text-neutral-400 max-w-2xl mx-auto"
					>
						{t('subtitle')}
					</motion.p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{services.map((service, index) => (
						<ServiceCard
							key={index}
							icon={service.icon}
							titleKey={service.titleKey}
							descKey={service.descKey}
							featureKeys={service.featureKeys}
							index={index}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
