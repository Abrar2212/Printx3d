import type { Metadata, Viewport } from "next";
import { Lato, Fira_Code } from "next/font/google";
import "./globals.css";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";

// Prevent FontAwesome from dynamically injecting CSS since it's already imported
config.autoAddCss = false;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0F172A",
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
  title: "PrintX3D — Precision 3D Printed Custom Studio",
  description:
    "Design and order precision-crafted custom 3D keychains, desk plates, and signage.",
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
        className="font-sans bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-[#059669]/20 selection:text-[#0F172A]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
