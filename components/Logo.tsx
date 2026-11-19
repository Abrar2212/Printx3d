import Link from "next/link";

interface LogoProps {
  /** Tailwind width class; height follows the 720×346 aspect ratio. */
  className?: string;
  /** White logo for dark backgrounds. */
  inverted?: boolean;
  /** Link target; pass null for a plain image. */
  href?: string | null;
}

export default function Logo({ className = "w-28", inverted = false, href = "/" }: LogoProps) {
  const img = (
    <img
      src={inverted ? "/images/logo-white.png" : "/images/logo.png"}
      alt="PrintX3D"
      width={720}
      height={346}
      className="w-full h-auto"
    />
  );
  return href ? (
    <Link
      href={href}
      aria-label="PrintX3D home"
      className={`block shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${className}`}
    >
      {img}
    </Link>
  ) : (
    <span className={`block shrink-0 ${className}`}>{img}</span>
  );
}
