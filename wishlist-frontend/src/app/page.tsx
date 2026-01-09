"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { PullToDarkToggle } from "@/components/PullToDarkToggle";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function Home() {
  const aboutRef = useRef(null);
  const isAboutInView = useInView(aboutRef, { once: true, margin: "-100px" });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Pull-to-Dark Toggle */}
      <PullToDarkToggle />

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center relative overflow-hidden pt-20 pb-32">
        <motion.div
          className="container relative z-10 flex flex-col items-center text-center"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Animated Badge */}
          <motion.div variants={fadeInUp} className="mb-8">
            <span className="px-4 py-1.5 rounded-full border border-foreground/20 text-xs font-medium tracking-wider uppercase bg-background/50 backdrop-blur-sm">
              Wishlist v2.0
            </span>
          </motion.div>

          {/* Hero Heading */}
          <motion.h1
            variants={fadeInUp}
            className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[0.9] text-foreground max-w-4xl tracking-tight mb-8"
          >
            Curate what <br /> <span className="italic text-accent">matters most.</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={fadeInUp}
            className="text-lg md:text-xl text-muted-foreground max-w-lg mb-12"
          >
            A distraction-free sanctuary for your desires. Track prices, organize items, and buy with intention.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeInUp} className="flex gap-4">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base">Login</Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base bg-transparent border-foreground">
                Get Started
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Floating Background Blob */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Decorative Floating Card - Right */}
        <motion.div
          className="hidden lg:block absolute right-[10%] top-[20%] w-64 h-80 bg-card rounded-lg shadow-2xl border border-border -z-10 opacity-90"
          initial={{ rotate: 6, y: 0 }}
          animate={{
            y: [0, -20, 0],
            rotate: [6, 3, 6]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          whileHover={{ rotate: 3, scale: 1.05 }}
        >
          <div className="p-5 h-full flex flex-col bg-card/50 backdrop-blur-sm">
            <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-md mb-4 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {/* Simple Headphone Icon SVG */}
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/40">
                <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
                <path d="M2 19h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H2v-6Z" />
                <path d="M19 19h3v6h-3a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Z" />
              </svg>
              <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-500/20">
                -13%
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-sm leading-tight">Sony WH-1000XM5</h3>
                <span className="text-xs font-bold text-green-600 dark:text-green-400">$348</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-[80%] bg-green-500/50 rounded-full" />
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Target price met!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Decorative Floating Card - Left */}
        <motion.div
          className="hidden lg:block absolute left-[10%] bottom-[20%] w-56 h-72 bg-background rounded-lg shadow-xl border border-border -z-10 opacity-80"
          initial={{ rotate: -12, y: 0 }}
          animate={{
            y: [0, 15, 0],
            rotate: [-12, -6, -12]
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          whileHover={{ rotate: -10, scale: 1.05 }}
        >
          <div className="p-5 h-full flex flex-col relative bg-card/50 backdrop-blur-sm">
            <div className="absolute top-5 left-5 right-5 h-28 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-900/20 rounded-md flex items-center justify-center border border-border/50">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-indigo-400/60">
                <rect width="20" height="12" x="2" y="3" rx="2" />
                <line x1="2" x2="22" y1="20" y2="20" />
              </svg>
            </div>
            <div className="space-y-3 mt-auto">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                  H
                </div>
                <div>
                  <p className="text-xs font-medium">MacBook Air</p>
                  <p className="text-[10px] text-muted-foreground">High Priority</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-border/50 pt-3">
                <span className="text-muted-foreground">Current</span>
                <span className="font-mono font-medium">$1,099</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* About Section */}
      <section ref={aboutRef} className="py-32 bg-muted/30 relative overflow-hidden">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={isAboutInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Why Choose <span className="text-accent italic">Wishlist</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for intentional shopping, powered by automation
            </p>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            className="grid md:grid-cols-3 gap-8"
            initial="hidden"
            animate={isAboutInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            {/* Feature 1 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
              className="bg-background rounded-xl p-8 border border-border shadow-lg transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Price Tracking</h3>
              <p className="text-muted-foreground leading-relaxed">
                Never overpay again. Get real-time alerts when prices drop below your target.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
              className="bg-background rounded-xl p-8 border border-border shadow-lg transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Priority Management</h3>
              <p className="text-muted-foreground leading-relaxed">
                Focus on what truly matters with smart prioritization and filtering.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
              className="bg-background rounded-xl p-8 border border-border shadow-lg transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.29 7 12 12 20.71 7" />
                  <line x1="12" y1="22" x2="12" y2="12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Auto Sync</h3>
              <p className="text-muted-foreground leading-relaxed">
                Fresh product data, always. Automatic metadata updates keep you informed.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Decorative gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/50">
        <div className="container">
          <p>© 2026 PACIFIC Wishlist. Crafted with intention.</p>
        </div>
      </footer>
    </div>
  );
}
