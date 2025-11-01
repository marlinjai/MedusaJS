import { Heading, Text } from "@medusajs/ui"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
  return (
    <div
      className="py-24 px-8 flex flex-col justify-center items-center text-center bg-stone-950 rounded-xl min-h-[50vh]"
      data-testid="empty-cart-message"
    >
      <div className="mb-6">
        <svg
          className="w-24 h-24 text-gray-600 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </div>
      <Heading
        level="h1"
        className="text-3xl font-bold text-gray-100 mb-4"
      >
        Your cart is empty
      </Heading>
      <Text className="text-base text-gray-400 mt-2 mb-8 max-w-md">
        You don&apos;t have anything in your cart. Let&apos;s change that, use
        the link below to start browsing our products.
      </Text>
      <div>
        <InteractiveLink href="/store">Explore products</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
