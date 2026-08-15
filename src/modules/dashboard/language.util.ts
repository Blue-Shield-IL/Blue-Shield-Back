import franc from "franc-min";

// Map franc ISO 639-3 codes -> { code: ISO 639-1, name: English name }
const ISO3_TO_LANG: Record<string, { code: string; name: string }> = {
  eng: { code: "en", name: "English" },
  arb: { code: "ar", name: "Arabic" },
  ara: { code: "ar", name: "Arabic" },
  heb: { code: "he", name: "Hebrew" },
  rus: { code: "ru", name: "Russian" },
  fra: { code: "fr", name: "French" },
  deu: { code: "de", name: "German" },
  spa: { code: "es", name: "Spanish" },
  ita: { code: "it", name: "Italian" },
  por: { code: "pt", name: "Portuguese" },
  nld: { code: "nl", name: "Dutch" },
  pol: { code: "pl", name: "Polish" },
  ukr: { code: "uk", name: "Ukrainian" },
  tur: { code: "tr", name: "Turkish" },
  pes: { code: "fa", name: "Persian" },
  fas: { code: "fa", name: "Persian" },
  urd: { code: "ur", name: "Urdu" },
  ind: { code: "id", name: "Indonesian" },
  cmn: { code: "zh", name: "Chinese" },
  zho: { code: "zh", name: "Chinese" },
  jpn: { code: "ja", name: "Japanese" },
  kor: { code: "ko", name: "Korean" },
  ell: { code: "el", name: "Greek" },
  ron: { code: "ro", name: "Romanian" },
  swe: { code: "sv", name: "Swedish" },
  hin: { code: "hi", name: "Hindi" },
  ben: { code: "bn", name: "Bengali" },
  vie: { code: "vi", name: "Vietnamese" },
  tha: { code: "th", name: "Thai" },
};

// Map common stored ISO 639-1 codes / names -> display name
const ISO1_TO_NAME: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  he: "Hebrew",
  iw: "Hebrew",
  ru: "Russian",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  uk: "Ukrainian",
  tr: "Turkish",
  fa: "Persian",
  ur: "Urdu",
  id: "Indonesian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  el: "Greek",
  ro: "Romanian",
  sv: "Swedish",
  hi: "Hindi",
  bn: "Bengali",
  vi: "Vietnamese",
  th: "Thai",
};

export interface DetectedLanguage {
  code: string; // ISO 639-1 (or "und")
  name: string; // English display name
}

const UNKNOWN: DetectedLanguage = { code: "und", name: "Unknown" };

/**
 * Resolve a language for a post: prefer a valid stored value, otherwise
 * detect it from the text content using franc.
 */
export function resolveLanguage(
  stored: string | null | undefined,
  text: string | null | undefined
): DetectedLanguage {
  // 1. Use stored value if it maps to a known language
  if (stored && typeof stored === "string") {
    const s = stored.trim().toLowerCase();
    if (ISO1_TO_NAME[s])
      return { code: s === "iw" ? "he" : s, name: ISO1_TO_NAME[s] };
  }

  // 2. Detect from text
  if (text && text.trim().length >= 10) {
    try {
      const iso3 = franc(text, { minLength: 10 });
      if (iso3 && iso3 !== "und" && ISO3_TO_LANG[iso3]) {
        return ISO3_TO_LANG[iso3];
      }
    } catch {
      // ignore detection errors
    }
  }

  return UNKNOWN;
}
