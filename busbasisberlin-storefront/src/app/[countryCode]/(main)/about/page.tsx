// about/page.tsx

"use client"

import Image from "next/image"
import { Timeline } from "@modules/common/components/ui/timeline"
import { useTranslations } from 'next-intl'

export default function AboutPage() {
  const t = useTranslations('about.timeline');

  const timelineData = [
    {
      title: t('2024.title'),
      content: (
        <div>
          <p className="text-neutral-300 text-xs md:text-sm font-normal mb-8">
            {t('2024.description')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="/images/about/Werkstattarbeiten_II.jpg"
              alt={t('2024.image1Alt')}
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
            <Image
              src="/images/about/tools_IV.jpg"
              alt={t('2024.image2Alt')}
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
          </div>
        </div>
      ),
    },
    {
      title: t('2020.title'),
      content: (
        <div>
          <p className="text-neutral-300 text-xs md:text-sm font-normal mb-8">
            {t('2020.description')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="/images/about/warehouse-2020.jpg"
              alt={t('2020.image1Alt')}
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
            <Image
              src="/images/about/team-2020.jpg"
              alt={t('2020.image2Alt')}
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
          </div>
        </div>
      ),
    },
    {
      title: t('2015.title'),
      content: (
        <div>
          <p className="text-neutral-300 text-xs md:text-sm font-normal mb-4">
            {t('2015.description')}
          </p>
          <div className="mb-8">
            <div className="flex gap-2 items-center text-neutral-400 text-xs md:text-sm">
              ✓ {t('2015.milestone1')}
            </div>
            <div className="flex gap-2 items-center text-neutral-400 text-xs md:text-sm">
              ✓ {t('2015.milestone2')}
            </div>
            <div className="flex gap-2 items-center text-neutral-400 text-xs md:text-sm">
              ✓ {t('2015.milestone3')}
            </div>
            <div className="flex gap-2 items-center text-neutral-400 text-xs md:text-sm">
              ✓ {t('2015.milestone4')}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="/images/about/Werkstattarbeiten_II.jpg"
              alt={t('2015.image1Alt')}
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
            <Image
              src="/images/about/tools_IV.jpg"
              alt={t('2015.image2Alt')}
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen w-full">
      <div className="w-full">
        <Timeline data={timelineData} />
      </div>
    </div>
  )
}
