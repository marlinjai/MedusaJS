"use client"

import { motion } from "framer-motion"
import { BsTools, BsBuildingGear, BsBox } from "react-icons/bs"

const services = [
  {
    icon: <BsTools className="w-8 h-8" />,
    title: "Wohnmobile & Expeditionsfahrzeuge",
    description:
      "Professionelle Beratung und individuelle Fertigung von Reise- und Expeditionsmobilen nach Ihren Wünschen. Von der Konzeption bis zur Umsetzung.",
    features: [
      "Individuelle Fahrzeugplanung",
      "Maßgeschneiderte Innenausstattung",
      "Spezialanfertigungen nach Bedarf",
      "Komplette Fahrzeugumbauten",
    ],
  },
  {
    icon: <BsBuildingGear className="w-8 h-8" />,
    title: "Reparatur & Restauration",
    description:
      "Spezialisierte Werkstatt für Mercedes-Transporter mit jahrzehntelanger Erfahrung. Professionelle Wartung und technische Modifikationen.",
    features: [
      "MB-Transporter Expertise",
      "Oldtimer-Restauration",
      "TÜV-Gutachten",
      "Technische Umbauten",
    ],
  },
  {
    icon: <BsBox className="w-8 h-8" />,
    title: "Ersatzteile & Ausstattung",
    description:
      "Umfangreiches Sortiment an Originalteilen und Zubehör für Ihren Mercedes-Transporter. Beschaffung und Lieferung von Spezialteilen.",
    features: [
      "Original MB-Ersatzteile",
      "Campingausbau-Zubehör",
      "Spezialteile-Service",
      "Fahrzeugbeschaffung",
    ],
  },
]

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
  )
}

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
            Seit über 30 Jahren Ihr Spezialist für Mercedes-Transporter und
            individuelle Fahrzeugumbauten in Berlin
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <ServiceCard key={index} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
