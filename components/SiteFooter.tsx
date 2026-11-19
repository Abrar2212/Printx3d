import Link from "next/link";
import Logo from "@/components/Logo";

export default function SiteFooter() {
  return (
    <footer className="bg-primary-navy text-white/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8 text-sm">
        <div className="space-y-3 text-center sm:text-left">
          <Logo inverted className="w-28 mx-auto sm:mx-0" />
          <p className="max-w-xs">Custom name keychains, 3D printed in two colours. Pay on delivery.</p>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-6 font-semibold">
          <Link href="/#studio" className="hover:text-white transition-colors">
            Design yours
          </Link>
          <Link href="/track" className="hover:text-white transition-colors">
            Track order
          </Link>
        </nav>
      </div>
      <p className="border-t border-white/10 py-5 text-center text-xs">© {new Date().getFullYear()} PrintX3D</p>
    </footer>
  );
}
