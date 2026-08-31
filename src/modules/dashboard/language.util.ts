import franc from "franc-min";

const langNames = new Intl.DisplayNames(["en"], { type: "language" });

// franc returns ISO 639-3; map the ones it uses to ISO 639-1
const ISO3_TO_ISO1: Record<string, string> = {
  eng: "en",
  arb: "ar",
  ara: "ar",
  heb: "he",
  rus: "ru",
  fra: "fr",
  deu: "de",
  spa: "es",
  ita: "it",
  por: "pt",
  nld: "nl",
  pol: "pl",
  ukr: "uk",
  tur: "tr",
  pes: "fa",
  fas: "fa",
  urd: "ur",
  ind: "id",
  cmn: "zh",
  zho: "zh",
  jpn: "ja",
  kor: "ko",
  ell: "el",
  ron: "ro",
  swe: "sv",
  hin: "hi",
  ben: "bn",
  vie: "vi",
  tha: "th",
};

export interface DetectedLanguage {
  code: string; // ISO 639-1 (or "und")
  name: string; // English display name
}

const UNKNOWN: DetectedLanguage = { code: "und", name: "Unknown" };

function nameFromCode(code: string): string | undefined {
  try {
    return langNames.of(code);
  } catch {
    return undefined;
  }
}

function fromIso1(code: string): DetectedLanguage | undefined {
  const normalized = code === "iw" ? "he" : code;
  const name = nameFromCode(normalized);
  if (!name) return undefined;
  return { code: normalized, name };
}

export function resolveLanguage(
  stored: string | null | undefined,
  text: string | null | undefined,
): DetectedLanguage {
  if (stored && typeof stored === "string") {
    const s = stored.trim().toLowerCase();
    const result = fromIso1(s);
    if (result) return result;
  }

  if (text && text.trim().length >= 10) {
    try {
      const iso3 = franc(text, { minLength: 10 });
      if (iso3 && iso3 !== "und") {
        const iso1 = ISO3_TO_ISO1[iso3];
        if (iso1) {
          const result = fromIso1(iso1);
          if (result) return result;
        }
      }
    } catch {
      // ignore detection errors
    }
  }

  return UNKNOWN;
}
