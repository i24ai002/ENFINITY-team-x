"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <main className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-black via-neutral-900 to-black text-white relative overflow-hidden">
      {/* Subtle glow/spotlight effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className={`text-center space-y-8 z-10 transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        {/* Brand name with gradient */}
        <h1 className="text-8xl font-black tracking-tight mb-4">
          <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            $ GULLAK
          </span>
        </h1>

        {/* Elegant divider */}
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mx-auto"></div>

        {/* Tagline */}
        <p className="text-xl text-gray-300 max-w-md mx-auto leading-relaxed font-light">
          See it. Trust it. Spend it.
        </p>

        {/* Premium button */}
        <div className="pt-4">
          <a
            href="/upload"
            className="inline-flex items-center px-8 py-4 bg-white text-black rounded-full text-lg font-semibold transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg hover:shadow-white/20 hover:bg-gray-100"
          >
            Get Started
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-gray-600 text-sm">
          Built for clarity. Not complexity.
        </p>
      </div>
    </main>
  );
}