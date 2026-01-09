
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center relative overflow-hidden pt-20 pb-32">
        <div className="container relative z-10 flex flex-col items-center text-center">

          {/* Animated/Floating Label */}
          <div className="mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
            <span className="px-4 py-1.5 rounded-full border border-[var(--foreground)]/20 text-xs font-medium tracking-wider uppercase bg-[var(--background)]/50 backdrop-blur-sm">
              Wishlist v2.0
            </span>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[0.9] text-[var(--foreground)] max-w-4xl tracking-tight mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
            Curate what <br /> <span className="italic text-[var(--accent)]">matters most.</span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--muted-foreground)] max-w-lg mb-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}>
            A distraction-free sanctuary for your desires. Track prices, organize items, and buy with intention.
          </p>

          <div className="flex gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.8s", animationFillMode: "forwards" }}>
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base">Get Started</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base bg-transparent border-[var(--foreground)]">View Demo</Button>
            </Link>
          </div>
        </div>

        {/* Abstract Floating Elements (Paper/Organic Shapes) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--accent)]/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Decorative Floating "Paper" Card */}
        <div className="hidden lg:block absolute right-[10%] top-[20%] w-64 h-80 bg-[var(--card)] rounded-lg shadow-2xl rotate-6 border border-[var(--border)] -z-10 opacity-80 transition-transform duration-1000 hover:rotate-3 hover:scale-105">
          <div className="p-6 h-full flex flex-col">
            <div className="w-full h-32 bg-[var(--muted)]/50 rounded-md mb-4"></div>
            <div className="w-3/4 h-4 bg-[var(--muted-foreground)]/20 rounded mb-2"></div>
            <div className="w-1/2 h-4 bg-[var(--muted-foreground)]/20 rounded"></div>
          </div>
        </div>

        <div className="hidden lg:block absolute left-[10%] bottom-[20%] w-56 h-72 bg-[var(--background)] rounded-lg shadow-xl -rotate-12 border border-[var(--border)] -z-10 opacity-60">
          <div className="p-6 h-full flex flex-col justify-end">
            <div className="w-full h-px bg-[var(--border)] mb-4"></div>
            <div className="flex justify-between items-center">
              <div className="w-8 h-8 rounded-full bg-[var(--muted)]"></div>
              <div className="w-16 h-2 bg-[var(--muted-foreground)]/30 rounded"></div>
            </div>
          </div>
        </div>

      </section>

      {/* simple footer */}
      <footer className="py-8 text-center text-sm text-[var(--muted-foreground)] border-t border-[var(--border)]/50">
        <div className="container">
          <p>© 2026 PACIFIC Wishlist. Crafted with intention.</p>
        </div>
      </footer>
    </div>
  );
}
