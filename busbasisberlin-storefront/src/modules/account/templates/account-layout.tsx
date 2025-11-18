// account-layout.tsx

'use client';

import React from "react"
import UnderlineLink from "@modules/common/components/interactive-link"
import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"
import { useTranslations } from 'next-intl'

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  const t = useTranslations('account.footer');
  // Top padding is handled by the main layout's HeroAlertPaddingWrapper
  // Only add bottom padding here

  return (
    <div className="flex-1 pb-12 small:pb-12" data-testid="account-page">
      <div className="flex-1 content-container h-full max-w-5xl mx-auto  flex flex-col">
        <div className="grid grid-cols-1  small:grid-cols-[240px_1fr] py-12">
          <div>{customer && <AccountNav customer={customer} />}</div>
          <div className="flex-1">{children}</div>
        </div>
        <div className="flex flex-col small:flex-row items-center justify-center small:justify-between small:border-t border-gray-200 py-12 gap-8">
          <div>
            <h3 className="text-xl-semi mb-4">{t('questions')}</h3>
            <span className="txt-medium">
              {t('faqText')}
            </span>
          </div>
          <div>
            <UnderlineLink href="/#contact">
              {t('customerService')}
            </UnderlineLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
