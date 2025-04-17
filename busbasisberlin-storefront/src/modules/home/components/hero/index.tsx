"use client"

import { Heading } from "@medusajs/ui"

const Hero = () => {
  return (
    <div className="relative h-[90vh] w-full overflow-hidden">
      {/* Video Background */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source 
          src="/videos/HeaderVideo.webm" 
          type="video/webm" 
        />
        Your browser does not support the video tag.
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-20" />

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Heading
            level="h1"
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 [text-shadow:_2px_2px_10px_rgb(0_0_0_/_40%)]"
          >
            Welcome to BusBasis Berlin
          </Heading>
          <Heading
            level="h2"
            className="text-xl sm:text-2xl lg:text-3xl font-light text-white/90 [text-shadow:_1px_1px_8px_rgb(0_0_0_/_30%)]"
          >
            Your Premium Bus Parts Destination
          </Heading>
        </div>

        {/* Optional: Add a CTA button */}
        <button className="mt-8 px-8 py-3 bg-white bg-opacity-10 hover:bg-opacity-20 border-2 border-white text-white text-lg font-medium rounded-full transition-all duration-300 backdrop-blur-sm">
          Explore Our Products
        </button>
      </div>

      {/* Optional: Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="animate-bounce">
          <svg 
            className="w-6 h-6 text-white" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>
    </div>
  )
}

export default Hero
