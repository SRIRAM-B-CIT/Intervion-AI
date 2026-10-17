export type SupportedLanguage = "en" | "hi-IN" | "ta-IN" | "te-IN" | "ml-IN";

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
  bcp47: string;
  defaultHrVoice: {
    female: string;
    male: string;
  };
  gdVoices: {
    priya: string;
    rahul: string;
  };
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    label: "English",
    nativeName: "English",
    bcp47: "en-IN",
    defaultHrVoice: { female: "female", male: "male" },
    gdVoices: { priya: "female", rahul: "male" },
  },
  {
    code: "hi-IN",
    label: "हिन्दी — Hindi",
    nativeName: "हिन्दी",
    bcp47: "hi-IN",
    defaultHrVoice: { female: "priya", male: "aditya" },
    gdVoices: { priya: "priya", rahul: "aditya" },
  },
  {
    code: "ta-IN",
    label: "தமிழ் — Tamil",
    nativeName: "தமிழ்",
    bcp47: "ta-IN",
    defaultHrVoice: { female: "priya", male: "gokul" },
    gdVoices: { priya: "priya", rahul: "gokul" },
  },
  {
    code: "te-IN",
    label: "తెలుగు — Telugu",
    nativeName: "తెలుగు",
    bcp47: "te-IN",
    defaultHrVoice: { female: "kavitha", male: "aditya" },
    gdVoices: { priya: "kavitha", rahul: "aditya" },
  },
  {
    code: "ml-IN",
    label: "മലയാളം — Malayalam",
    nativeName: "മലയാളം",
    bcp47: "ml-IN",
    defaultHrVoice: { female: "priya", male: "aditya" },
    gdVoices: { priya: "priya", rahul: "aditya" },
  },
];

export function getLanguageOption(code: SupportedLanguage): LanguageOption {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
}

export function isIndianLanguage(code: SupportedLanguage): boolean {
  return code !== "en";
}

export const GD_VOICES: Record<SupportedLanguage, { priya: string; rahul: string }> = {
  en: { priya: "female", rahul: "male" },
  "hi-IN": { priya: "priya", rahul: "aditya" },
  "ta-IN": { priya: "priya", rahul: "gokul" },
  "te-IN": { priya: "kavitha", rahul: "aditya" },
  "ml-IN": { priya: "priya", rahul: "aditya" },
};
