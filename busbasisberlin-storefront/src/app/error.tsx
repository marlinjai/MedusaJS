'use client'

// Custom error page to handle React 19 RC SSR issues
// This prevents the "Cannot read properties of null (reading 'useContext')" error

import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import Link from "next/link"
import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">Something went wrong!</h1>
      <p className="text-small-regular text-ui-fg-base">
        An error occurred while loading this page.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-ui-bg-interactive text-ui-fg-on-color rounded-md"
        >
          Try again
        </button>
        <Link className="flex gap-x-1 items-center group px-4 py-2" href="/">
          <Text className="text-ui-fg-interactive">Go to frontpage</Text>
          <ArrowUpRightMini
            className="group-hover:rotate-45 ease-in-out duration-150"
            color="var(--fg-interactive)"
          />
        </Link>
      </div>
    </div>
  )
}
