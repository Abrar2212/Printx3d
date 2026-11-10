"use client";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export default function TextInput({ value, onChange, maxLength = 30 }: TextInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-[#0F172A]">
          Custom Lettering / Name
        </label>
        <span className="text-xs text-[#64748B] font-mono">
          {value.length}/{maxLength}
        </span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder="e.g. Dr. Sterling"
        className="h-[44px] px-3.5 py-2.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] placeholder-[#94A3B8] text-base sm:text-sm focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all shadow-xs"
      />
      <span className="text-xs text-[#64748B]">
        Supports standard Latin characters and punctuation.
      </span>
    </div>
  );
}
