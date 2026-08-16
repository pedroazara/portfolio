import { useLocation } from "react-router-dom";
import { Language } from "./translations";

/**
 * Bilingual routing.
 *
 * Portuguese is the default and lives at the root (`/curriculo`); English is a
 * parallel branch under `/en` with translated segments (`/en/resume`). The URL
 * is the single source of truth for the active language — there is no stored
 * preference and no automatic redirect, so every page is shareable and
 * indexable in the language its link points at.
 *
 * Internally the app keeps reasoning in Portuguese paths ("canonical paths").
 * `stripLocale` turns any incoming URL into `{ language, canonical PT path }`,
 * and `localePath` turns a canonical PT path back into a real URL for a given
 * language. Slugs are shared between languages, so a post keeps one identity.
 */

/** First-segment translations. Anything not listed here is language-neutral. */
const SEGMENT_PT_TO_EN: Record<string, string> = {
  curriculo: "resume",
  projetos: "projects",
  project: "projects",
};

const SEGMENT_EN_TO_PT: Record<string, string> = {
  resume: "curriculo",
  projects: "projetos",
};

function mapFirstSegment(path: string, table: Record<string, string>): string {
  const [, first, ...rest] = path.split("/");
  if (!first) return path;
  const mapped = table[first];
  if (!mapped) return path;
  return "/" + [mapped, ...rest].join("/");
}

/**
 * Splits a real URL path into the active language and the Portuguese-canonical
 * path the rest of the app matches against.
 */
export function stripLocale(pathname: string): { language: Language; path: string } {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const rest = pathname.slice(3) || "/";
    return { language: "en", path: mapFirstSegment(rest, SEGMENT_EN_TO_PT) };
  }
  return { language: "pt", path: pathname };
}

/**
 * Builds the real URL for a Portuguese-canonical path in the given language.
 * Admin paths (`/admin/...`) aren't in the translation table, so they keep
 * their Portuguese segments and just gain the `/en` wrapper — private,
 * unindexed pages don't need translated URLs, but the language toggle should
 * still work while an admin editor is open.
 */
export function localePath(path: string, language: Language): string {
  if (language === "pt") return path;
  const translated = mapFirstSegment(path, SEGMENT_PT_TO_EN);
  return translated === "/" ? "/en" : `/en${translated}`;
}

/**
 * The same page in the other language — used by the PT/EN switch so the reader
 * stays where they are instead of being dropped on the home page.
 */
export function switchLanguagePath(pathname: string, target: Language): string {
  const { path } = stripLocale(pathname);
  return localePath(path, target);
}

/**
 * Builds links that stay in the language the reader is already browsing.
 * Takes a Portuguese-canonical path and returns the URL for the active
 * language, so components can link without threading `language` through props.
 */
export function useLocalePath(): (path: string) => string {
  const { language } = stripLocale(useLocation().pathname);
  return (path: string) => localePath(path, language);
}

/** The active language, read from the URL. */
export function useLanguage(): Language {
  return stripLocale(useLocation().pathname).language;
}
