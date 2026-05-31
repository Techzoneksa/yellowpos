import type { Metadata, Viewport } from "next";
import "../src/styles.css";

export const viewport: Viewport = {
  themeColor: "#952650",
};

export const metadata: Metadata = {
  title: "Yellow Chicken POS — يلو تشكن",
  description: "نظام نقاط البيع لمطاعم يلو تشكن. Tablet-first POS UI prototype.",
  openGraph: {
    title: "Yellow Chicken POS — يلو تشكن",
    description: "نظام نقاط البيع لمطاعم يلو تشكن. Tablet-first POS UI prototype.",
    type: "website",
    images: ["https://storage.googleapis.com/gpt-engineer-file-uploads/k2pMo3qWp1hc8u8gxj0ifxf9EBQ2/social-images/social-1779112622024-broastcombo-1.webp"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yellow Chicken POS — يلو تشكن",
    description: "نظام نقاط البيع لمطاعم يلو تشكن. Tablet-first POS UI prototype.",
    images: ["https://storage.googleapis.com/gpt-engineer-file-uploads/k2pMo3qWp1hc8u8gxj0ifxf9EBQ2/social-images/social-1779112622024-broastcombo-1.webp"],
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}