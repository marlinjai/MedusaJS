// services/index.tsx

"use client"

import { motion } from "framer-motion"
import { BsTools, BsBuildingGear, BsBox } from "react-icons/bs"
import { useTranslations } from 'next-intl'

const ServiceCard = ({ icon, titleKey, descKey, featureKeys, index }: {
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
      className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all duration-300"
    >
      <div className="mb-6 p-3 bg-blue-500/10 w-fit rounded-xl text-blue-400">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-4 text-white">{t(titleKey as any)}</h3>
      <p className="text-neutral-400 mb-6">{t(descKey as any)}</p>
      <ul className="space-y-3">
        {featureKeys.map((featureKey: string, idx: number) => (
          <li key={idx} className="flex items-center text-neutral-300">
            <span className="mr-2 text-blue-400">•</span>
            {t(featureKey as any)}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

export default function Services() {
  const t = useTranslations('services');

  const services = [
    {
      icon: <BsTools className="w-8 h-8" />,
      titleKey: 'camperVans.title',
      descKey: 'camperVans.description',
      featureKeys: [
        'camperVans.features.planning',
        'camperVans.features.interior',
        'camperVans.features.custom',
        'camperVans.features.complete'
      ],
    },
    {
      icon: <BsBuildingGear className="w-8 h-8" />,
      titleKey: 'repair.title',
      descKey: 'repair.description',
      featureKeys: [
        'repair.features.expertise',
        'repair.features.restoration',
        'repair.features.inspection',
        'repair.features.modifications'
      ],
    },
    {
      icon: <BsBox className="w-8 h-8" />,
      titleKey: 'parts.title',
      descKey: 'parts.description',
      featureKeys: [
        'parts.features.original',
        'parts.features.accessories',
        'parts.features.specialist',
        'parts.features.procurement'
      ],
    },
  ];

  return (
    <section id="services" className="py-24 px-4 md:px-8 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
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
  )
}
