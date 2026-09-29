import type { Metadata } from "next";
import "./globals.css";
import OfflineBanner from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "Ricton Healthcare Platform | Modern Digital Health & Telemedicine",
  description: "Comprehensive healthcare portal for appointments, virtual consultations, e-prescriptions, and digital pharmacy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <OfflineBanner />
        {children}</body>
    </html>
  );
}
