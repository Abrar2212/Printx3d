import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Rubik, Fira_Code } from "next/font/google";
import "./globals.css";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";

// Prevent FontAwesome from dynamically injecting CSS since it's already imported
config.autoAddCss = false;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1, // no maximumScale: people must be able to pinch-zoom
  viewportFit: "cover",
  themeColor: "#FFF8F1", // cream, matches the customer pages
};

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  weight: ["500", "700", "800"],
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PrintX3D — Custom 3D Printed Name Keychains",
  description: "Design a two-colour 3D printed name keychain, preview it in 3D, and get it delivered.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${rubik.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans bg-bg text-primary-navy antialiased selection:bg-brand/20 selection:text-primary-navy"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
