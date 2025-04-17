import { Suspense } from "react"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import TransparentHeader from "@modules/layout/components/transparent-header"
import MobileMenu from "@modules/layout/components/mobile-menu"
import { mainNavItems } from "@modules/layout/config/navigation"

export default async function Nav() {
  const regions = await listRegions().then((regions: StoreRegion[]) => regions)

  return (
    <>
      <TransparentHeader />
      <div className="fixed top-0 inset-x-0 z-50 group">
        <header className="relative h-16 mx-auto transition-all duration-300">
          <nav className="content-container txt-xsmall-plus text-white flex items-center justify-between w-full h-full text-small-regular">
            {/* Logo */}
            <div className="flex items-center h-full">
              <LocalizedClientLink
                href="/"
                className="txt-compact-xlarge-plus hover:text-white/80 uppercase"
                data-testid="nav-store-link"
              >
                BusBasis Berlin
              </LocalizedClientLink>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {mainNavItems.map((item) => (
                <LocalizedClientLink
                  key={item.href}
                  href={item.href}
                  className="hover:text-white/80 transition-colors duration-200"
                >
                  {item.label}
                </LocalizedClientLink>
              ))}
            </div>

            {/* Right Section - Account, Cart, & Mobile Menu */}
            <div className="flex items-center gap-x-6 h-full">
              {/* Account Link - Hidden on Mobile */}
              <div className="hidden md:flex items-center gap-x-6 h-full">
                <LocalizedClientLink
                  className="hover:text-white/80"
                  href="/account"
                  data-testid="nav-account-link"
                >
                  Account
                </LocalizedClientLink>
              </div>

              {/* Cart Button */}
              <Suspense
                fallback={
                  <LocalizedClientLink
                    className="hover:text-white/80 flex gap-2"
                    href="/cart"
                    data-testid="nav-cart-link"
                  >
                    Cart (0)
                  </LocalizedClientLink>
                }
              >
                <CartButton />
              </Suspense>

              {/* Mobile Menu */}
              <MobileMenu />
            </div>
          </nav>
        </header>
      </div>
    </>
  )
}
