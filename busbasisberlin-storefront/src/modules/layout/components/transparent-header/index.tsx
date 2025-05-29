"use client"

import { useEffect, useState } from "react"

export default function TransparentHeader() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 50)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <style jsx global>{`
      .fixed header {
        background-color: ${isScrolled
          ? "rgba(0, 0, 0, 0.8)"
          : "rgba(0, 0, 0, 0.45)"};
        backdrop-filter: ${isScrolled ? "blur(8px)" : "blur(3px)"};
      }
    `}</style>
  )
}
