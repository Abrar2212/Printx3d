"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faCheck } from "@fortawesome/free-solid-svg-icons";

interface HeroSectionProps {
  onScrollToStudio: () => void;
}

const FACTS = ["Cash on delivery", "Keyring included", "See it in 3D first"];

const STEPS = [
  { n: "1", title: "Type a name", text: "Up to 3 lines, in the font you like.", block: "bg-brand-tint" },
  { n: "2", title: "Pick two colours", text: "One for the letters, one for the base.", block: "bg-sun-tint" },
  { n: "3", title: "We print & deliver", text: "Printed, checked and brought to your door.", block: "bg-sky-tint" },
];

export default function HeroSection({ onScrollToStudio }: HeroSectionProps) {
  return (
    <>
      <section className="overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16 md:pt-16 md:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-7 text-center lg:text-left">
            <span className="inline-block rounded-full bg-primary-navy text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5">
              Custom 3D printed keychains
            </span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-primary-navy text-balance">
              Your name, printed <span className="text-brand">in 3D.</span>
            </h1>
            <p className="text-lg sm:text-xl text-primary-navy/75 max-w-md mx-auto lg:mx-0 leading-relaxed">
              Type it, pick two colours, turn it around in 3D. We print it and bring it to your door.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <button
                type="button"
                onClick={onScrollToStudio}
                className="h-14 px-8 rounded-full bg-brand hover:bg-brand-hover text-white text-lg font-bold transition-colors inline-flex items-center gap-2.5 cursor-pointer shadow-lg shadow-brand/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
              >
                Design yours
                <FontAwesomeIcon icon={faArrowDown} className="text-base" />
              </button>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start text-sm font-semibold text-primary-navy/80">
              {FACTS.map((f) => (
                <li key={f} className="inline-flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-tertiary-sage text-white inline-flex items-center justify-center">
                    <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Photo on colour blocks */}
          <div className="relative w-[85%] sm:w-full max-w-md mx-auto">
            <div aria-hidden className="absolute -inset-3 sm:-inset-4 rounded-[2rem] bg-brand rotate-3" />
            <div aria-hidden className="absolute -top-8 -right-4 w-20 h-20 rounded-full bg-sun-tint hidden sm:block" />
            <img
              src="/images/real-prints.jpg"
              alt="A ring of finished two-colour name keychains with metal split rings"
              width={590}
              height={476}
              className="relative w-full rounded-[2rem] border-4 border-white shadow-2xl shadow-primary-navy/20 -rotate-2"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
        <h2 id="how-title" className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6">
          How it works
        </h2>
        <ol className="grid sm:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <li key={s.n} className={`${s.block} rounded-3xl p-5 sm:p-6 flex sm:block items-center gap-5`}>
              <span className="font-display text-4xl sm:text-5xl font-extrabold text-primary-navy leading-none">{s.n}</span>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-primary-navy sm:mt-4">{s.title}</h3>
                <p className="text-primary-navy/75 mt-0.5 sm:mt-1">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
