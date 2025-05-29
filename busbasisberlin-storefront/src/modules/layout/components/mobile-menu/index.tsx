"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Transition } from "@headlessui/react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { mainNavItems } from "@modules/layout/config/navigation"

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const menuContent = (
    <Transition
      show={isOpen}
      enter="transition-opacity duration-200"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div
        className="fixed inset-0 w-full h-full min-h-screen bg-black/90 backdrop-blur-sm"
        style={{ zIndex: 99999 }}
        onClick={() => setIsOpen(false)}
      >
        <div
          className="relative flex flex-col items-center justify-center min-h-screen w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-white/80 transition-colors duration-200"
            aria-label="Close menu"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Navigation items */}
          <div className="flex flex-col items-center space-y-8">
            {mainNavItems.map((item) => (
              <LocalizedClientLink
                key={item.href}
                href={item.href}
                className="text-white text-2xl hover:text-white/80 transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </LocalizedClientLink>
            ))}
          </div>
        </div>
      </div>
    </Transition>
  )

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden text-white hover:text-white/80 transition-colors duration-200"
        aria-label="Toggle mobile menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {mounted && createPortal(menuContent, document.body)}
    </>
  )
}
