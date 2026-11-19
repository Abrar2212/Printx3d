import Link from "next/link";
import Logo from "@/components/Logo";

/** Customer-facing top bar: logo home link + order tracking. */
export default function SiteHeader() {
  return (
    <header className="bg-surface/90 backdrop-blur border-b border-border sticky top-0 z-30">
      <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between">
        <Logo className="w-28" />
        <Link
          href="/track"
          className="h-10 px-4 inline-flex items-center rounded-lg text-sm font-semibold text-primary-navy hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30"
        >
          Track order
        </Link>
      </div>
    </header>
  );
}
