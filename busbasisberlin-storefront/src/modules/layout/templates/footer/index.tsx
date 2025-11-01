// footer/index.tsx

'use client'

import { useState } from 'react'
import LocalizedClientLink from '@modules/common/components/localized-client-link'
import { footerNavItems } from '@modules/layout/config/navigation'
import { MdOutlineMail } from 'react-icons/md'
import { FiPhone, FiMapPin } from 'react-icons/fi'
import { FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa'
import { useTranslations } from 'next-intl'

// Footer accordion for mobile
const FooterAccordion = ({ title, items }: { title: string; items: typeof footerNavItems }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-4 text-left"
      >
        <span className="text-lg font-semibold text-foreground">{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-6 h-6 text-foreground transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={isOpen ? 'M18 12H6' : 'M12 6v12m6-6H6'} />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? '500px' : '0' }}
      >
        <ul className="pb-4 space-y-3 px-2">
          {items.map((item) => (
            <li key={item.href}>
              <LocalizedClientLink
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-card border-t border-border w-full" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>

      <div className="content-container py-12 sm:py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 pb-8">
          {/* Column 1: About / Brand */}
          <div>
            <LocalizedClientLink
              href="/"
              className="text-2xl font-bold text-foreground hover:text-primary transition-colors"
            >
              {t('companyName')}
            </LocalizedClientLink>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              {t('description')}
            </p>

            {/* Social Links */}
            <div className="flex gap-4 mt-6">
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
              >
                <FaFacebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links - Desktop only */}
          <div className="hidden md:block">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('quickLinks')}</h3>
            <ul className="space-y-3">
              {footerNavItems.map((item) => (
                <li key={item.href}>
                  <LocalizedClientLink
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact Info */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('contact')}</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="tel:+4933035365540"
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FiPhone className="w-5 h-5 flex-shrink-0" />
                  <span>03303 5365540</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:basiscampberlin-onlineshop.de"
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MdOutlineMail className="w-5 h-5 flex-shrink-0" />
                  <span>basiscampberlin-onlineshop.de</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <FiMapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  16547 Birkenwerder
                </span>
              </li>
            </ul>

            {/* Opening Hours */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-3">{t('openingHours')}</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <span>{t('mondayFriday')}</span>
                  <span className="text-foreground">08:00–16:00</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>{t('saturdaySunday')}</span>
                  <span className="text-foreground">{t('closed')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Accordion */}
          <div className="md:hidden">
            <FooterAccordion title={t('quickLinks')} items={footerNavItems} />
          </div>
        </div>

        {/* Bottom section */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            &copy; {currentYear} Basis Camp Berlin GmbH. {t('rights')}
          </p>
          <div className="flex gap-4 text-sm">
            <LocalizedClientLink
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('privacy')}
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('terms')}
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
