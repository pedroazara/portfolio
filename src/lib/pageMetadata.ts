export const siteOrigin = (import.meta.env.VITE_SITE_URL || "https://pedroazara.vercel.app").replace(/\/$/, "");

export function syncPageMetadata(options: { title: string; description: string; path: string; language: string; image?: string; privatePage: boolean }) {
  const { title, description, path, language, privatePage } = options;
  const canonicalUrl = `${siteOrigin}${path}`;
  let image = options.image || `${siteOrigin}/og-home.png`;
  if (image.startsWith("db:")) {
    const storage = import.meta.env.VITE_SUPABASE_URL?.replace(/\/(rest|auth|storage|realtime)\/v1\/?$/, "").replace(/\/$/, "");
    image = storage ? `${storage}/storage/v1/object/public/images/${image.slice(3)}` : `${siteOrigin}/og-home.png`;
  }
  try { const url = new URL(image, siteOrigin); image = /^https?:$/.test(url.protocol) ? url.href : `${siteOrigin}/og-home.png`; } catch { image = `${siteOrigin}/og-home.png`; }
  const meta = (attribute: "name" | "property", key: string, value: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, key); document.head.append(element); }
    element.content = value;
  };
  document.title = title;
  document.documentElement.lang = language === "en" ? "en" : "pt-BR";
  meta("name", "description", description);
  meta("name", "robots", privatePage ? "noindex, nofollow" : "index, follow");
  for (const [key, value] of Object.entries({ title, description, url: canonicalUrl, image, type: "website", locale: language === "en" ? "en_US" : "pt_BR" })) meta("property", `og:${key}`, value);
  for (const [key, value] of Object.entries({ card: "summary_large_image", title, description, image })) meta("name", `twitter:${key}`, value);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.append(canonical); }
  canonical.href = canonicalUrl;
  // Prerendered entities belong to the document we arrived on, not subsequent SPA routes.
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach(element => element.remove());
  if (!privatePage) {
    const structured = document.createElement("script"); structured.type = "application/ld+json";
    structured.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: title, description, url: canonicalUrl, image, inLanguage: language });
    document.head.append(structured);
  }
}
