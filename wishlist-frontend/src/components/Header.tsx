"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export function Header() {
    const pathname = usePathname();
    const isHomePage = pathname === "/";

    return (
        <header className="py-6 container flex justify-between items-center">
            <div className="font-serif text-2xl tracking-tight">PACIFIC</div>
            {/* Only show toggle on non-home pages */}
            {!isHomePage && <ThemeToggle />}
        </header>
    );
}
