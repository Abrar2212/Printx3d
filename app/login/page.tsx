"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faCircleExclamation,
  faCubes,
  faDownload,
  faEye,
  faEyeSlash,
  faListCheck,
  faLock,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import Logo from "@/components/Logo";

// Only follow same-site paths, so /login?next=//evil.com can't send staff elsewhere.
function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !/^\/[\\/]/.test(next) ? next : null;
}

const PERKS = [
  { icon: faListCheck, text: "Live order queue, from new to shipped" },
  { icon: faDownload, text: "Print-ready STL files, one click each" },
  { icon: faCubes, text: "The exact model the customer approved" },
];

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "That password didn't work. Check it and try again." : "Sign-in failed. Try again.");
        setLoading(false);
        return;
      }
      const { role } = await res.json();
      const next = safeNext(new URLSearchParams(window.location.search).get("next"));
      window.location.href = next ?? (role === "admin" ? "/admin" : "/operator"); // spinner stays until it loads
    } catch {
      setError("Can't reach the server. Check your connection.");
      setLoading(false);
    }
  }

  const trackCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState("CapsLock"));

  return (
    <main className="min-h-screen bg-bg grid lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand panel (desktop) ── */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary-navy text-white p-12 xl:p-16">
        <div aria-hidden className="pointer-events-none absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full bg-brand/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-48 -right-24 w-[520px] h-[520px] rounded-full bg-info/15 blur-3xl" />

        <Logo inverted className="relative w-36" />

        <div className="relative space-y-8 max-w-md">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Workshop portal
            </span>
            <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.1]">From order to print bed.</h2>
            <p className="text-muted text-base leading-relaxed">
              Everything the print desk needs to turn today&apos;s orders into finished keychains.
            </p>
          </div>

          <ul className="space-y-3">
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-success">
                  <FontAwesomeIcon icon={p.icon} className="text-xs" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <figure className="relative max-w-sm">
          <div className="rounded-2xl overflow-hidden border border-white/15 shadow-2xl rotate-[-1.5deg]">
            <img
              src="/images/real-prints.jpg"
              alt="A ring of finished two-colour name keychains on a white table"
              className="w-full h-44 object-cover"
            />
          </div>
          <figcaption className="mt-3 text-xs text-muted">Real prints from our workshop.</figcaption>
        </figure>
      </section>

      {/* ── Sign-in form ── */}
      <section className="relative flex flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="relative w-full max-w-sm">
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary-slate hover:text-primary-navy transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
              Back to store
            </Link>
            <Logo className="w-24 lg:hidden" href={null} />
          </div>

          <div className="bg-surface border border-border rounded-2xl shadow-lg shadow-primary-navy/5 p-7 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-11 h-11 rounded-xl bg-brand-tint text-brand flex items-center justify-center">
                <FontAwesomeIcon icon={faLock} />
              </span>
              <div>
                <h1 className="text-xl font-bold text-primary-navy tracking-tight">Staff sign in</h1>
                <p className="text-sm text-secondary-slate mt-0.5">Reception and admin only</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-primary-navy mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    autoFocus
                    required
                    value={password}
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : capsLock ? "caps-hint" : undefined}
                    onKeyDown={trackCapsLock}
                    onKeyUp={trackCapsLock}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    className={`w-full h-12 pl-4 pr-12 bg-bg border rounded-xl text-primary-navy text-base placeholder:text-muted transition-colors focus:outline-none focus:bg-surface focus:ring-4 ${
                      error
                        ? "border-error focus:ring-error/15"
                        : "border-border-subtle focus:border-primary-navy focus:ring-primary-navy/10"
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-lg text-secondary-slate hover:text-primary-navy transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30"
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-sm" />
                  </button>
                </div>

                {capsLock && !error && (
                  <p id="caps-hint" className="mt-2 text-sm font-medium text-warning-ink flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCircleExclamation} className="text-xs" />
                    Caps Lock is on
                  </p>
                )}
              </div>

              {error && (
                <p
                  id="login-error"
                  role="alert"
                  className="text-sm font-medium text-error-ink bg-error/5 border border-error/20 px-3 py-2.5 rounded-lg flex items-start gap-2"
                >
                  <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="group w-full h-12 bg-primary-navy hover:bg-primary-navy-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-base transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-navy/25"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform group-enabled:group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-secondary-slate">Forgot the password? Ask the shop admin.</p>
        </div>
      </section>
    </main>
  );
}
