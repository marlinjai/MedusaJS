"use client"

import { useActionState, useState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { signup } from "@lib/data/customer"
import { useTranslations } from 'next-intl'
import LegalModal from "@modules/layout/components/legal-modal"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const t = useTranslations('account.register');
  const [message, formAction] = useActionState(signup, null)
  const [modalOpen, setModalOpen] = useState<'privacy' | 'terms' | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  return (
    <div
      className="max-w-sm flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-large-semi uppercase mb-6">
        {t('title')}
      </h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-4">
        {t('subtitle')}
      </p>
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label={t('firstName')}
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label={t('lastName')}
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label={t('email')}
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label={t('phone')}
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label={t('password')}
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="register-error" />

        {/* Terms & Privacy Checkbox */}
        <div className="mt-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              required
              data-testid="terms-checkbox"
            />
            <span className="text-ui-fg-base text-small-regular leading-relaxed">
              {t('agreeCheckbox')}{" "}
              <button
                type="button"
                onClick={() => setModalOpen('privacy')}
                className="underline hover:text-blue-400 transition-colors"
              >
                {t('privacyPolicy')}
              </button>{" "}
              {t('and')}{" "}
              <button
                type="button"
                onClick={() => setModalOpen('terms')}
                className="underline hover:text-blue-400 transition-colors"
              >
                {t('termsOfUse')}
              </button>
              .
            </span>
          </label>
        </div>

        <SubmitButton
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="register-button"
          disabled={!termsAccepted}
        >
          {t('createAccount')}
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t('alreadyMember')}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          {t('signIn')}
        </button>
        .
      </span>

      {/* Legal Modals */}
      {modalOpen && (
        <LegalModal
          isOpen={modalOpen !== null}
          onClose={() => setModalOpen(null)}
          type={modalOpen}
        />
      )}
    </div>
  )
}

export default Register
