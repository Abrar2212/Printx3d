import Link from "next/link";
import Logo from "@/components/Logo";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-secondary-slate">
        <Logo className="w-24" />
        <nav className="flex items-center gap-6">
          <Link href="/#studio" className="hover:text-primary-navy transition-colors">
            Design yours
          </Link>
          <Link href="/track" className="hover:text-primary-navy transition-colors">
            Track order
          </Link>
        </nav>
        <p>© {new Date().getFullYear()} PrintX3D</p>
      </div>
    </footer>
  );
}
