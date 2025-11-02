"use client"

import { useEffect, useState } from "react"

export default function TransparentHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      
      // Background transparency
      setIsScrolled(scrollPosition > 50)
      
      // Auto-hide on scroll down, show on scroll up
      if (scrollPosition < 10) {
        // Always show at top
        setIsVisible(true)
      } else if (scrollPosition > lastScrollY && scrollPosition > 100) {
        // Scrolling down - hide
        setIsVisible(false)
      } else if (scrollPosition < lastScrollY) {
        // Scrolling up - show
        setIsVisible(true)
      }
      
      setLastScrollY(scrollPosition)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  return (
    <style jsx global>{`
      .fixed header {
        background-color: ${isScrolled
          ? "rgba(0, 0, 0, 0.8)"
          : "rgba(0, 0, 0, 0.45)"};
        backdrop-filter: ${isScrolled ? "blur(8px)" : "blur(3px)"};
        transform: translateY(${isVisible ? "0" : "-100%"});
        transition: transform 0.3s ease-in-out, background-color 0.3s ease-in-out;
      }
    `}</style>
  )
}
