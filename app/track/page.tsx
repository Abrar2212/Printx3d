"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function TrackLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().replace(/^#/, "").replace(/^PX-/i, "");
    if (!/^[0-9a-f]{8}$/i.test(clean)) {
      setError("Order codes look like PX-3A8F1C2B (8 letters and numbers after PX-).");
      return;
    }
    router.push(`/track/PX-${clean.toUpperCase()}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-primary-navy">
      <SiteHeader />
      <main className="flex-1 w-full max-w-sm mx-auto px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight">Track your order</h1>
        <p className="text-secondary-slate mt-2">Enter the code you got when you placed your order.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3" noValidate>
          <label htmlFor="order-code" className="block text-sm font-semibold">
            Order code
          </label>
          <input
            id="order-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            placeholder="PX-3A8F1C2B"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? "code-error" : undefined}
            className={`w-full h-12 px-4 rounded-xl bg-surface border font-mono text-base uppercase placeholder:normal-case placeholder:text-muted focus:outline-none focus:ring-4 transition-colors ${
              error ? "border-error focus:ring-error/15" : "border-border-subtle focus:border-primary-navy focus:ring-primary-navy/10"
            }`}
          />
          {error && (
            <p id="code-error" role="alert" className="text-sm text-error-ink">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full h-12 rounded-xl bg-primary-navy hover:bg-primary-navy-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-navy/25"
          >
            Track
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
