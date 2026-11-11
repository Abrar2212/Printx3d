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
        <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
          Name
        </label>
        <span className="text-[10px] text-[#64748B] font-mono">
          {value.length}/{maxLength}
        </span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder="Type a name..."
        className="h-10 px-3.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]/15 transition-all shadow-2xs"
      />
    </div>
  );
}
