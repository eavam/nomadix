import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const siteUrl = new URL("https://nomadixapps.org");
const siteDescription =
  "Nomadix is an independent app studio creating focused, beautifully simple iOS and Android apps, including ScanKeeper and TrayHabit.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Nomadix Apps — Independent iOS & Android App Studio",
    template: "%s — Nomadix Apps",
  },
  description: siteDescription,
  applicationName: "Nomadix Apps",
  authors: [{ name: "Nomadix Apps LLC", url: siteUrl }],
  creator: "Nomadix Apps LLC",
  publisher: "Nomadix Apps LLC",
  category: "technology",
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.svg",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Nomadix Apps",
    title: "Nomadix Apps — Independent App Studio",
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nomadix Apps — Apps made wherever we land.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nomadix Apps — Independent App Studio",
    description: siteDescription,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
