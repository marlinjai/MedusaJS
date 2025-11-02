'use client';

import { Heading } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useTranslations } from 'next-intl';
import React from "react"

const Help = () => {
  const t = useTranslations('order.help');

  return (
    <div className="mt-8 bg-neutral-800/30 rounded-lg p-6 border border-neutral-700">
      <Heading className="text-lg font-semibold text-white mb-4">{t('title')}</Heading>
      <div className="text-base-regular">
        <ul className="gap-y-3 flex flex-col">
          <li>
            <LocalizedClientLink href="/#contact" className="text-blue-400 hover:text-blue-300 transition-colors">
              → {t('contact')}
            </LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/#contact" className="text-blue-400 hover:text-blue-300 transition-colors">
              → {t('returns')}
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help
