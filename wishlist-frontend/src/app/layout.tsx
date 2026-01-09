import type { Metadata } from "next";
import { Outfit, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  style: "italic"
});

export const metadata: Metadata = {
  title: "Wishlist App",
  description: "A premium wishlist management application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${instrumentSerif.variable} font-sans`}>
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <header className="py-6 container flex justify-between items-center">
                <div className="font-serif text-2xl tracking-tight">PACIFIC</div>
                <ThemeToggle />
              </header>
              <main className="flex-1">
                {children}
              </main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
