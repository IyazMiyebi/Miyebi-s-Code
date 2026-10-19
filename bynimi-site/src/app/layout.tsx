import type { Metadata } from "next";
import { Geist, Instrument_Serif, Spline_Sans_Mono } from "next/font/google";
import { currencyGuard } from "@/lib/currency";
import { introGuard } from "@/lib/intro";
import { store } from "@/lib/store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(store.url),
  title: {
    default: `${store.name}: ${store.tagline}`,
    template: `%s | ${store.name}`,
  },
  description: store.description,
  openGraph: {
    siteName: store.name,
    type: "website",
    locale: "en_NG",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${instrumentSerif.variable} ${splineMono.variable} h-full antialiased`}
      // introGuard and currencyGuard set data-* attributes before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introGuard + currencyGuard }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
