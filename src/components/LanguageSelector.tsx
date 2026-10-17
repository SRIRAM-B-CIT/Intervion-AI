import React from "react";
import { Globe } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  getLanguageOption,
} from "../types/language";

interface LanguageSelectorProps {
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
  disabled?: boolean;
  variant?: "card" | "compact";
  className?: string;
}

export default function LanguageSelector({
  value,
  onChange,
  disabled = false,
  variant = "card",
  className = "",
}: LanguageSelectorProps) {
  const current = getLanguageOption(value);

  if (variant === "compact") {
    return (
      <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
        <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SupportedLanguage)}
          disabled={disabled}
          aria-label="Select Interview Language"
          className="appearance-none bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 text-xs font-semibold px-2.5 py-1 pr-6 rounded-lg border border-zinc-200 outline-none focus:border-emerald-500 transition-all cursor-pointer disabled:opacity-50"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 text-[10px] text-zinc-400">
          ▼
        </span>
      </div>
    );
  }

  return (
    <div
      className={`w-full max-w-xs flex flex-col items-center gap-2 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
        <Globe className="w-3.5 h-3.5 text-emerald-600" />
        <span>Interview Language</span>
      </div>
      <div className="relative w-full">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SupportedLanguage)}
          disabled={disabled}
          aria-label="Select Interview Language"
          className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-emerald-500 transition-all cursor-pointer text-center appearance-none pr-8 disabled:opacity-50"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
          ▼
        </span>
      </div>
      <p className="text-[11px] text-zinc-400 font-medium">
        {value === "en" ? "Standard English conversation & voice" : `Powered by Sarvam AI (${current.nativeName})`}
      </p>
    </div>
  );
}
