import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pwnops.vercel.app"),
  alternates: {
    canonical: '/',
  },
  title: {
    default: "PwnOps — Automated Vulnerability Management & Incident Response",
    template: "%s | PwnOps",
  },
  verification: {
    google: 'FuE3SufSZlhSS47hxR2BoGtucMQocDdfcXGPx_tA4uk',
  },
  description:
    "Enterprise-grade automated defense for cloud-native environments. Detect, prioritize, and remediate critical vulnerabilities across your entire attack surface.",
  keywords: [
    "Cybersecurity",
    "Vulnerability Management",
    "Incident Response",
    "SOC Dashboard",
    "Threat Intelligence",
    "DevSecOps",
    "Cloud Security",
    "SIEM",
    "Attack Surface Management"
  ],
  authors: [{ name: "PwnOps Sec Ops" }],
  creator: "PwnOps Sec Ops",
  publisher: "PwnOps",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "PwnOps — Next-Gen Security Operations Center",
    description:
      "Enterprise-grade automated defense for cloud-native environments. Detect, prioritize, and remediate critical vulnerabilities.",
    url: "https://pwnops.vercel.app",
    siteName: "PwnOps",
    images: [
      {
        url: "/og-image.png", // Next.js resolves this against metadataBase
        width: 1200,
        height: 630,
        alt: "PwnOps Security Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PwnOps — Advanced Threat Detection",
    description:
      "Enterprise-grade automated defense for cloud-native environments. Monitor and mitigate threats in real-time.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
