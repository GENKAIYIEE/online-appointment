import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RHU Agoo Online Appointment System",
  description: "Book and manage your appointments with the Agoo Rural Health Unit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-inter bg-[var(--color-bg-main)] text-[var(--color-text-primary)]">
        {children}
        <Toaster richColors position="bottom-right" toastOptions={{ className: 'font-inter font-medium shadow-xl border-none', duration: 3000 }} />
      </body>
    </html>
  );
}
