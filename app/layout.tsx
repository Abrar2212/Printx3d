import type { Metadata, Viewport } from "next";
import { Lato, Fira_Code } from "next/font/google";
import "./globals.css";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";

// Prevent FontAwesome from dynamically injecting CSS since it's already imported
config.autoAddCss = false;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1, // no maximumScale: people must be able to pinch-zoom
  viewportFit: "cover",
  themeColor: "#F9EDED", // brand-tint, matches the hero
};

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "700", "900"],
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
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
      className={`${lato.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans bg-bg text-primary-navy antialiased selection:bg-tertiary-sage/20 selection:text-primary-navy"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
