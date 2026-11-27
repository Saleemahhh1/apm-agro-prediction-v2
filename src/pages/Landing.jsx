import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Globe from "react-globe.gl";

export default function Landing({ onGetStarted }) {
  const [isBNBPrimary, setIsBNBPrimary] = useState(true);
  const [globeSize, setGlobeSize] = useState(() => window.innerWidth < 640 ? 260 : 400);

  useEffect(() => {
    const updateGlobeSize = () => setGlobeSize(window.innerWidth < 640 ? 260 : 400);
    window.addEventListener("resize", updateGlobeSize);
    return () => window.removeEventListener("resize", updateGlobeSize);
  }, []);

  // color swap effect every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBNBPrimary((prev) => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative flex min-h-[500px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-green-950 via-black to-yellow-900 px-4 py-14 text-white sm:min-h-[560px] sm:px-6 md:min-h-screen md:py-0">
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-to-t from-green-800/20 via-transparent to-yellow-600/20 blur-3xl" />

      {/* 🌿 Logo Section */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 mx-auto w-full max-w-4xl px-1 text-center"
      >
        <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl md:tracking-wide">
          <span className={isBNBPrimary ? "text-bnbYellow" : "text-apmGreen"}>
            APM
          </span>
          <span className="text-white/70">-</span>
          <span className={!isBNBPrimary ? "text-bnbYellow" : "text-apmGreen"}>
            agro
          </span>
        </h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1.2 }}
          className="mx-auto mb-4 max-w-2xl text-base leading-relaxed text-white/80 sm:mb-6 sm:text-lg md:text-xl"
        >
          Decentralized agriculture forecasting and data democratization
          <br />
          <span className="text-bnbYellow/90">Built on Binance Smart Chain</span>
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="mx-auto max-w-xl text-xs italic leading-relaxed text-white/70 sm:text-sm md:text-base"
        >
          Turning local insights into global intelligence 🌍
        </motion.p>
      </motion.div>

      {/* 🌍 Rotating Globe */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[18%] z-0 -translate-x-1/2 opacity-20 sm:top-[22%] sm:opacity-25 md:top-[30%] md:opacity-30"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
      >
        <Globe
          width={globeSize}
          height={globeSize}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          showAtmosphere={true}
          atmosphereColor="#FFD700"
          atmosphereAltitude={0.2}
        />
      </motion.div>

      {/* 🌟 Action Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="relative z-10 mt-9 sm:mt-12 md:mt-16"
      >
        <button
          onClick={onGetStarted}
          className="bg-apmGold text-darkBg px-8 py-3 rounded-xl font-semibold text-lg hover:bg-apmGold/90 transition transform hover:scale-105 shadow-lg shadow-yellow-500/30"
        >
          Get Started
        </button>
      </motion.div>

      {/* 🔻 Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8, y: [0, 10, 0] }}
        transition={{
          delay: 2,
          repeat: Infinity,
          duration: 2,
          ease: "easeInOut",
        }}
        className="absolute bottom-4 flex flex-col items-center text-xs text-white/55 sm:bottom-6 sm:text-sm"
      >
        <span>Scroll down</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 mt-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.div>

    </section>
  );
}

