import Link from "next/link";
import Logo from "@/components/Logo";

/** Customer-facing top bar: logo, order tracking, and the main call to action. */
export default function SiteHeader() {
  return (
    <header className="bg-cream/90 backdrop-blur border-b border-primary-navy/10 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
        <Logo className="w-24 sm:w-28" />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/track"
            className="h-10 px-3 sm:px-4 inline-flex items-center rounded-full text-sm font-bold text-primary-navy hover:bg-primary-navy/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30"
          >
            Track order
          </Link>
          <Link
            href="/#studio"
            className="h-10 px-4 sm:px-5 inline-flex items-center rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
          >
            Design yours
          </Link>
        </nav>
      </div>
    </header>
  );
}
