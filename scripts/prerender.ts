import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { initialResumeData } from "../src/data/initialData";
import { slugOf } from "../src/utils/slug";
import { localePath } from "../src/lib/routes";

dotenv.config();

const BASE_URL = "https://pedroazara.vercel.app";

// URL publica do Storage, para transformar referencias `db:` em URLs absolutas.
// Sem a variavel de ambiente, caimos no banner generico em vez de emitir um
// og:image quebrado com o esquema db: cru.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  ?.trim()
  .replace(/\/(rest|auth|storage|realtime)\/v1\/?$/, "")
  .replace(/\/+$/, "");

function resolveOgImage(src: string | undefined, fallback: string): string {
  if (!src) return fallback;
  if (src.startsWith("db:")) {
    if (!SUPABASE_URL) return fallback;
    return `${SUPABASE_URL}/storage/v1/object/public/images/${src.slice(3)}`;
  }
  return src;
}
const DIST_DIR = path.resolve(process.cwd(), "dist");

if (!fs.existsSync(DIST_DIR)) {
  console.error("Directory dist/ does not exist. Run vite build first.");
  process.exit(1);
}

const templatePath = path.join(DIST_DIR, "index.html");
const templateHtml = fs.readFileSync(templatePath, "utf-8");

type Lang = "pt" | "en";

interface RouteMeta {
  /** Caminho canônico em português — a mesma página nos dois idiomas. */
  canonicalPath: string;
  lang: Lang;
  title: string;
  description: string;
  type: "website" | "article";
  ogImage: string;
  jsonLd?: object;
  prerenderContent: string;
}

// Rascunhos existem só para o autor, dentro do modo de edição. O pré-render
// gera HTML estático e entradas de sitemap que os buscadores leem sem executar
// JavaScript nenhum — se os rascunhos passassem por aqui, o filtro do cliente
// seria inútil e as fichas em branco acabariam indexadas. Filtramos na origem.
const publishedProjects = (initialResumeData.projects || []).filter((p) => !p.draft);
const publishedPosts = (initialResumeData.posts || []).filter((p) => !p.draft);

// Helper for dates
const formatDates = (start?: string, end?: string, current?: boolean, lang: Lang = "pt") => {
  if (!start) return "";
  const endStr = current ? (lang === "en" ? "Present" : "Presente") : (end || "");
  return `${start} - ${endStr}`;
};

const authorName = initialResumeData.profile.name || "Pedro Henrique Almeida";
const t = (lang: Lang, pt: string, en: string) => (lang === "en" ? en : pt);
// Campo bilíngue de um item: usa a versão do idioma se existir, com o
// português como reserva — o mesmo padrão de fallback usado no app em si.
const bi = (lang: Lang, ptValue: string | undefined, enValue: string | undefined) =>
  (lang === "en" ? enValue || ptValue : ptValue) || "";

function buildRoutes(lang: Lang): RouteMeta[] {
  const routes: RouteMeta[] = [];

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": authorName,
    "jobTitle": t(lang, "Estudante de Engenharia Física & Pesquisador CNPq", "Engineering Physics Student & CNPq Researcher"),
    "worksFor": {
      "@type": "EducationalOrganization",
      "name": "Universidade Federal de Lavras (UFLA)"
    },
    "email": initialResumeData.profile.email || "",
    "url": `${BASE_URL}${localePath("/", lang)}`,
    "sameAs": [
      initialResumeData.profile.github || "",
      initialResumeData.profile.linkedin || "",
      initialResumeData.profile.twitter || ""
    ].filter(Boolean)
  };

  // 1. Home / Curriculum Route
  routes.push({
    canonicalPath: "/",
    lang,
    title: `${authorName} | ${t(lang, "Currículo, Portfólio & Blog", "Resume, Portfolio & Blog")}`,
    description: bi(lang, initialResumeData.profile.bio, initialResumeData.profile.bioEn),
    type: "website",
    ogImage: `${BASE_URL}/og-home.svg`,
    jsonLd: personJsonLd,
    prerenderContent: `
    <header>
      <h1>${authorName}</h1>
      <p>${bi(lang, initialResumeData.profile.title, initialResumeData.profile.titleEn)}</p>
      <p>${bi(lang, initialResumeData.profile.bio, initialResumeData.profile.bioEn)}</p>
    </header>
    <main>
      <section id="curriculo">
        <h2>${t(lang, "Experiência & Formação", "Experience & Education")}</h2>
        ${(initialResumeData.experiences || []).map(e => `
          <article>
            <h3>${bi(lang, e.role, e.roleEn)} - ${e.company || ""}</h3>
            <p>${formatDates(e.startDate, e.endDate, e.current, lang)}</p>
            <p>${bi(lang, e.description, e.descriptionEn)}</p>
          </article>
        `).join("")}
      </section>
      <section id="projetos">
        <h2>${t(lang, "Projetos de Destaque", "Featured Projects")}</h2>
        ${publishedProjects.map(p => `
          <article>
            <h3>${bi(lang, p.title, p.titleEn)}</h3>
            <p>${bi(lang, p.description, p.descriptionEn)}</p>
          </article>
        `).join("")}
      </section>
    </main>
  `
  });

  routes.push({
    canonicalPath: "/curriculo",
    lang,
    title: `${t(lang, "Currículo", "Resume")} | ${authorName}`,
    description: t(
      lang,
      `Currículo acadêmico e profissional de ${authorName} - Engenharia Física UFLA, Óptica e Instrumentação Científica.`,
      `Academic and professional resume of ${authorName} — Engineering Physics at UFLA, Optics and Scientific Instrumentation.`
    ),
    type: "website",
    ogImage: `${BASE_URL}/og-home.svg`,
    jsonLd: personJsonLd,
    prerenderContent: `
    <main>
      <h1>${t(lang, "Currículo de", "Resume of")} ${authorName}</h1>
      <p>${bi(lang, initialResumeData.profile.title, initialResumeData.profile.titleEn)}</p>
      <p>${bi(lang, initialResumeData.profile.bio, initialResumeData.profile.bioEn)}</p>
      <section>
        <h2>${t(lang, "Experiência de Pesquisa & Laboratório", "Research & Lab Experience")}</h2>
        ${(initialResumeData.experiences || []).map(e => `
          <article>
            <h3>${bi(lang, e.role, e.roleEn)} - ${e.company || ""}</h3>
            <p>${formatDates(e.startDate, e.endDate, e.current, lang)} | ${bi(lang, e.location, e.locationEn)}</p>
            <p>${bi(lang, e.description, e.descriptionEn)}</p>
          </article>
        `).join("")}
      </section>
      <section>
        <h2>${t(lang, "Formação Acadêmica", "Education")}</h2>
        ${(initialResumeData.educations || []).map(e => `
          <article>
            <h3>${bi(lang, e.degree, e.degreeEn)} - ${bi(lang, e.institution, e.institutionEn)}</h3>
            <p>${formatDates(e.startDate, e.endDate, e.current, lang)}</p>
            <p>${bi(lang, e.description, e.descriptionEn)}</p>
          </article>
        `).join("")}
      </section>
    </main>
  `
  });

  // 2. Blog Listing Route
  routes.push({
    canonicalPath: "/blog",
    lang,
    title: `${t(lang, "Blog & Artigos", "Blog & Articles")} | ${authorName}`,
    description: t(
      lang,
      "Artigos e notas técnicas sobre física computacional, óptica ultrarrápida, instrumentação e automação experimental.",
      "Articles and technical notes on computational physics, ultrafast optics, instrumentation and experimental automation."
    ),
    type: "website",
    ogImage: `${BASE_URL}/og-home.svg`,
    prerenderContent: `
    <main>
      <h1>${t(lang, "Blog & Artigos de Física & Instrumentação", "Physics & Instrumentation Blog & Articles")}</h1>
      <p>${t(lang, "Acompanhe publicações, simulações numéricas e notas técnicas.", "Follow along with publications, numerical simulations and technical notes.")}</p>
      <section>
        ${publishedPosts.map(post => `
          <article>
            <h2><a href="${BASE_URL}${localePath(`/blog/${slugOf(post)}`, lang)}">${bi(lang, post.title, post.titleEn)}</a></h2>
            <p>${bi(lang, post.summary, post.summaryEn)}</p>
            <time>${post.date || ""}</time>
          </article>
        `).join("")}
      </section>
    </main>
  `
  });

  // 3. Blog Post Routes
  publishedPosts.forEach(post => {
    const postTitle = bi(lang, post.title, post.titleEn);
    const postSummary = bi(lang, post.summary, post.summaryEn);
    const blogJsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": postTitle,
      "description": postSummary,
      "datePublished": post.date || "",
      "author": { "@type": "Person", "name": authorName },
      "publisher": { "@type": "Person", "name": authorName },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${BASE_URL}${localePath(`/blog/${slugOf(post)}`, lang)}`
      }
    };

    routes.push({
      canonicalPath: `/blog/${slugOf(post)}`,
      lang,
      title: `${postTitle} | ${t(lang, `Blog de ${authorName}`, `${authorName}'s Blog`)}`,
      description: postSummary,
      type: "article",
      ogImage: resolveOgImage(post.imageUrl, `${BASE_URL}/og-home.svg`),
      jsonLd: blogJsonLd,
      prerenderContent: `
      <article>
        <header>
          <h1>${postTitle}</h1>
          <p>${t(lang, "Publicado por", "Published by")} ${authorName} ${t(lang, "em", "on")} ${post.date || ""}</p>
        </header>
        <div>
          <p><strong>${postSummary}</strong></p>
          <div>${bi(lang, post.content, post.contentEn).replace(/\n/g, "<br/>")}</div>
        </div>
      </article>
    `
    });
  });

  // 4. Project Routes
  publishedProjects.forEach(project => {
    const projTitle = bi(lang, project.title, project.titleEn);
    const projDescription = bi(lang, project.description, project.descriptionEn);
    const projDetailed = bi(lang, project.detailedDescription, project.detailedDescriptionEn);
    const projRelevance = bi(lang, project.scientificRelevance, project.scientificRelevanceEn);

    const content = `
      <article>
        <h1>${projTitle}</h1>
        <p>${projDescription}</p>
        ${projDetailed ? `<p>${projDetailed}</p>` : ""}
        ${projRelevance ? `<section><h2>${t(lang, "Relevância Científica", "Scientific Relevance")}</h2><p>${projRelevance}</p></section>` : ""}
      </article>
    `;

    routes.push({
      canonicalPath: `/projetos/${slugOf(project)}`,
      lang,
      title: `${projTitle} | ${t(lang, `Projetos de ${authorName}`, `${authorName}'s Projects`)}`,
      description: projDescription,
      type: "website",
      ogImage: resolveOgImage(project.imageUrl, `${BASE_URL}/og-home.svg`),
      prerenderContent: content
    });

    // Alias for /project/:id
    routes.push({
      canonicalPath: `/project/${slugOf(project)}`,
      lang,
      title: `${projTitle} | ${t(lang, `Projetos de ${authorName}`, `${authorName}'s Projects`)}`,
      description: projDescription,
      type: "website",
      ogImage: resolveOgImage(project.imageUrl, `${BASE_URL}/og-home.svg`),
      prerenderContent: `
      <article>
        <h1>${projTitle}</h1>
        <p>${projDescription}</p>
      </article>
    `
    });
  });

  return routes;
}

const ptRoutes = buildRoutes("pt");
const enRoutes = buildRoutes("en");
const allRoutes = [...ptRoutes, ...enRoutes];

// Write static HTML files for each route
allRoutes.forEach(route => {
  const urlPath = localePath(route.canonicalPath, route.lang);
  const canonicalUrl = `${BASE_URL}${urlPath === "/" ? "" : urlPath}`;
  const ptUrl = `${BASE_URL}${localePath(route.canonicalPath, "pt")}`;
  const enUrl = `${BASE_URL}${localePath(route.canonicalPath, "en")}`;

  let headTags = `
    <title>${escapeXml(route.title || "")}</title>
    <meta name="description" content="${escapeXml(route.description || "")}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="alternate" type="application/rss+xml" title="Blog RSS" href="${BASE_URL}/feed.xml" />
    <link rel="alternate" hreflang="pt-BR" href="${ptUrl}" />
    <link rel="alternate" hreflang="en" href="${enUrl}" />
    <link rel="alternate" hreflang="x-default" href="${ptUrl}" />
    <meta property="og:title" content="${escapeXml(route.title || "")}" />
    <meta property="og:description" content="${escapeXml(route.description || "")}" />
    <meta property="og:image" content="${route.ogImage}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="${route.type}" />
    <meta property="og:locale" content="${route.lang === "en" ? "en_US" : "pt_BR"}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeXml(route.title || "")}" />
    <meta name="twitter:description" content="${escapeXml(route.description || "")}" />
    <meta name="twitter:image" content="${route.ogImage}" />
  `;

  if (route.jsonLd) {
    headTags += `\n    <script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script>`;
  }

  let pageHtml = templateHtml.replace(/<title>.*?<\/title>/i, "");
  pageHtml = pageHtml.replace(/<html([^>]*)lang="[^"]*"/i, `<html$1lang="${route.lang === "en" ? "en" : "pt-BR"}"`);
  pageHtml = pageHtml.replace(/<head>/i, `<head>\n${headTags}`);
  pageHtml = pageHtml.replace(
    `<div id="root"></div>`,
    `<div id="root"><noscript>${route.prerenderContent}</noscript></div>`
  );

  let targetFilePath: string;
  if (urlPath === "/") {
    targetFilePath = path.join(DIST_DIR, "index.html");
  } else {
    const cleanRoute = urlPath.replace(/^\//, "");
    const targetDir = path.join(DIST_DIR, cleanRoute);
    fs.mkdirSync(targetDir, { recursive: true });
    targetFilePath = path.join(targetDir, "index.html");
  }

  fs.writeFileSync(targetFilePath, pageHtml, "utf-8");
});

// Generate robots.txt
const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${BASE_URL}/sitemap.xml
`;
fs.writeFileSync(path.join(DIST_DIR, "robots.txt"), robotsTxt, "utf-8");

// Generate sitemap.xml — cada rota entra duas vezes (pt e en), cada uma
// apontando pra irmã via <xhtml:link hreflang>, como o Google recomenda para
// conteúdo traduzido.
const buildDate = new Date().toISOString().split("T")[0];
const sitemapUrls = allRoutes.map(route => {
  const urlPath = localePath(route.canonicalPath, route.lang);
  const loc = `${BASE_URL}${urlPath === "/" ? "" : urlPath}`;
  const ptUrl = `${BASE_URL}${localePath(route.canonicalPath, "pt")}`;
  const enUrl = `${BASE_URL}${localePath(route.canonicalPath, "en")}`;
  const priority = route.canonicalPath === "/" ? "1.0" : route.canonicalPath.startsWith("/blog/") ? "0.8" : "0.7";
  const post = route.canonicalPath.startsWith("/blog/")
    ? publishedPosts.find(p => `/blog/${slugOf(p)}` === route.canonicalPath)
    : undefined;
  return `  <url>
    <loc>${loc}</loc>
    <xhtml:link rel="alternate" hreflang="pt-BR" href="${ptUrl}" />
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${ptUrl}" />
    <lastmod>${post?.date || buildDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join("\n");

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapUrls}
</urlset>`;

fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), sitemapXml, "utf-8");

// Generate static OG SVG banner for home
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f172a" />
  <circle cx="1100" cy="100" r="300" fill="#4f46e5" opacity="0.15" />
  <circle cx="100" cy="530" r="250" fill="#06b6d4" opacity="0.1" />
  <text x="80" y="220" font-family="sans-serif" font-size="52" font-weight="900" fill="#ffffff">${escapeXml(authorName)}</text>
  <text x="80" y="290" font-family="sans-serif" font-size="28" font-weight="600" fill="#818cf8">Engenharia Física - UFLA | Pesquisador CNPq</text>
  <text x="80" y="360" font-family="sans-serif" font-size="22" fill="#94a3b8">Óptica Ultrarrápida • Instrumentação Científica • Física Computacional</text>
  <rect x="80" y="440" width="340" height="60" rx="12" fill="#4f46e5" />
  <text x="250" y="478" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${BASE_URL.replace("https://", "")}</text>
</svg>`;

fs.writeFileSync(path.join(DIST_DIR, "og-home.svg"), ogSvg, "utf-8");
fs.writeFileSync(path.resolve(process.cwd(), "public/og-home.svg"), ogSvg, "utf-8");

// Generate RSS feed for the blog (Portuguese — the canonical language)
const feedItems = [...publishedPosts]
  .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  .map(post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${BASE_URL}/blog/${slugOf(post)}</link>
      <guid isPermaLink="true">${BASE_URL}/blog/${slugOf(post)}</guid>
      <description>${escapeXml(post.summary)}</description>
      <pubDate>${post.date ? new Date(`${post.date}T12:00:00Z`).toUTCString() : ""}</pubDate>
    </item>`)
  .join("\n");

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog de ${escapeXml(authorName)}</title>
    <link>${BASE_URL}/blog</link>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Artigos e notas técnicas sobre física computacional, instrumentação e automação experimental.</description>
    <language>pt-BR</language>
${feedItems}
  </channel>
</rss>`;

fs.writeFileSync(path.join(DIST_DIR, "feed.xml"), rssXml, "utf-8");

console.log(`Prerender complete! ${allRoutes.length} routes (${ptRoutes.length} pt + ${enRoutes.length} en) prerendered to dist/ with sitemap.xml, robots.txt, and metadata.`);

function escapeXml(unsafe: string | undefined | null): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
