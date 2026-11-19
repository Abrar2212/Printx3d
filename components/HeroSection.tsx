"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown } from "@fortawesome/free-solid-svg-icons";

interface HeroSectionProps {
  onScrollToStudio: () => void;
}

const STEPS = [
  { n: "1", title: "Type a name", text: "Up to 30 characters, in the font you like." },
  { n: "2", title: "Pick two colours", text: "One for the letters, one for the base." },
  { n: "3", title: "We print & deliver", text: "Keyring included. Pay on delivery." },
];

export default function HeroSection({ onScrollToStudio }: HeroSectionProps) {
  return (
    <>
      <section className="bg-brand-tint">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-primary-navy text-balance">
              Your name, 3D printed in two colours.
            </h1>
            <p className="text-lg text-primary-navy/75 max-w-md mx-auto lg:mx-0 leading-relaxed">
              Design a custom keychain, see it in 3D, and get it delivered to your door.
            </p>
            <button
              type="button"
              onClick={onScrollToStudio}
              className="h-12 px-7 rounded-xl bg-primary-navy hover:bg-primary-navy-hover text-white text-base font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-navy/25"
            >
              Design yours
              <FontAwesomeIcon icon={faArrowDown} className="text-sm" />
            </button>
          </div>

          <img
            src="/images/real-prints.jpg"
            alt="A ring of finished two-colour name keychains with metal split rings"
            width={590}
            height={476}
            className="w-full max-w-md mx-auto rounded-2xl shadow-xl shadow-primary-navy/10"
          />
        </div>
      </section>

      <section aria-label="How it works" className="border-b border-border bg-surface">
        <ol className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="w-9 h-9 shrink-0 rounded-full bg-brand-tint text-brand font-bold flex items-center justify-center">
                {s.n}
              </span>
              <div>
                <h2 className="font-semibold text-primary-navy">{s.title}</h2>
                <p className="text-sm text-secondary-slate mt-0.5">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
