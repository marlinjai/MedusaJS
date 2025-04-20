"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { FaLinkedinIn } from "react-icons/fa";

const teamMembers = [
  {
    name: "Hendrik",
    role: "Geschäftsführer & Fahrzeugexperte",
    image: "/images/team/hendrik.jpg",
    linkedin: "#",
  },
  {
    name: "gerd",
    role: "Technischer Leiter",
    image: "/images/team/gerd.jpg",
    linkedin: "#",
  },
  {
    name: "Michael",
    role: "KFZ - Mechaniker",
    image: "/images/team/michael.jpg",
    linkedin: "#",
  },
  {
    name: "Udo",
    role: "Restaurationsexperte",
    image: "/images/team/udo.jpg",
    linkedin: "#",
  },
  {
    name: "Conny",
    role: "Büro und Management",
    image: "/images/team/conny.jpg",
    linkedin: "#",
  },
];

const TeamMemberCard = ({ member, index }: { member: any; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative group"
    >
      <div className="relative w-48 h-48 mx-auto overflow-hidden rounded-full">
        {/* Decorative circle background */}
        <div className="absolute inset-0 bg-[#141414] group-hover:scale-110 transition-transform duration-500" />
        
        {/* Crack effect overlay */}
        <div className="absolute inset-0 bg-[url('/images/crack-overlay.png')] opacity-30 mix-blend-overlay" />
        
        {/* Profile image */}
        <div className="relative h-[140%] transform group-hover:scale-105 transition-transform duration-500">
          <Image
            src={member.image}
            alt={member.name}
            fill
            className="object-cover bg-top"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="text-center mt-4 space-y-1">
        <h3 className="text-lg font-semibold text-white">{member.name}</h3>
        <p className="text-sm text-neutral-400">{member.role}</p>
      </div>
    </motion.div>
  );
};

export default function Team() {
  return (
    <section className="py-24 px-4 md:px-8 relative overflow-hidden">
 
      
      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent"
          >
            Unser Team
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-neutral-400 max-w-2xl mx-auto"
          >
            Erfahrene Spezialisten mit Leidenschaft für Mercedes-Transporter und individuelle Fahrzeugumbauten
          </motion.p>
        </div>

        {/* Custom 5-member layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8 items-start">
          {/* First row - 3 members */}
          <div className="md:col-span-2">
            <TeamMemberCard member={teamMembers[0]} index={0} />
          </div>
          <div className="md:col-span-2">
            <TeamMemberCard member={teamMembers[1]} index={1} />
          </div>
          <div className="md:col-span-2">
            <TeamMemberCard member={teamMembers[2]} index={2} />
          </div>
          
          {/* Second row - 2 members centered */}
          <div className="md:col-start-2 md:col-span-2">
            <TeamMemberCard member={teamMembers[3]} index={3} />
          </div>
          <div className="md:col-span-2">
            <TeamMemberCard member={teamMembers[4]} index={4} />
          </div>
        </div>
      </div>
    </section>
  );
} 