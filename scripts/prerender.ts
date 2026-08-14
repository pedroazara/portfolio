import fs from "fs";
import path from "path";
import { initialResumeData } from "../src/data/initialData";
import { slugOf } from "../src/utils/slug";

const BASE_URL = "https://pedroazara.vercel.app";
const DIST_DIR = path.resolve(process.cwd(), "dist");

if (!fs.existsSync(DIST_DIR)) {
  console.error("Directory dist/ does not exist. Run vite build first.");
  process.exit(1);
}

const templatePath = path.join(DIST_DIR, "index.html");
const templateHtml = fs.readFileSync(templatePath, "utf-8");

interface RouteMeta {
  urlPath: string;
  title: string;
  description: string;
  type: "website" | "article";
  ogImage: string;
  jsonLd?: object;
  prerenderContent: string;
}

const routes: RouteMeta[] = [];

// Rascunhos existem só para o autor, dentro do modo de edição. O pré-render
// gera HTML estático e entradas de sitemap que os buscadores leem sem executar
// JavaScript nenhum — se os rascunhos passassem por aqui, o filtro do cliente
// seria inútil e as fichas em branco acabariam indexadas. Filtramos na origem.
const publishedProjects = (initialResumeData.projects || []).filter((p) => !p.draft);
const publishedPosts = (initialResumeData.posts || []).filter((p) => !p.draft);

// Helper for dates
const formatDates = (start?: string, end?: string, current?: boolean) => {
  if (!start) return "";
  const endStr = current ? "Presente" : (end || "");
  return `${start} - ${endStr}`;
};

// 1. Home / Curriculum Route
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "name": initialResumeData.profile.name || "Pedro Henrique Almeida",
  "jobTitle": "Estudante de Engenharia Física & Pesquisador CNPq",
  "worksFor": {
    "@type": "EducationalOrganization",
    "name": "Universidade Federal de Lavras (UFLA)"
  },
  "email": initialResumeData.profile.email || "",
  "url": BASE_URL,
  "sameAs": [
    initialResumeData.profile.github || "",
    initialResumeData.profile.linkedin || "",
    initialResumeData.profile.twitter || ""
  ].filter(Boolean)
};

routes.push({
  urlPath: "/",
  title: `${initialResumeData.profile.name || "Pedro Henrique Almeida"} | Currículo, Portfólio & Blog`,
  description: initialResumeData.profile.bio || "",
  type: "website",
  ogImage: `${BASE_URL}/og-home.svg`,
  jsonLd: personJsonLd,
  prerenderContent: `
    <header>
      <h1>${initialResumeData.profile.name || "Pedro Henrique Almeida"}</h1>
      <p>${initialResumeData.profile.title || ""}</p>
      <p>${initialResumeData.profile.bio || ""}</p>
    </header>
    <main>
      <section id="curriculo">
        <h2>Experiência & Formação</h2>
        ${(initialResumeData.experiences || []).map(e => `
          <article>
            <h3>${e.role || ""} - ${e.company || ""}</h3>
            <p>${formatDates(e.startDate, e.endDate, e.current)}</p>
            <p>${e.description || ""}</p>
          </article>
        `).join("")}
      </section>
      <section id="projetos">
        <h2>Projetos de Destaque</h2>
        ${publishedProjects.map(p => `
          <article>
            <h3>${p.title || ""}</h3>
            <p>${p.description || ""}</p>
          </article>
        `).join("")}
      </section>
    </main>
  `
});

routes.push({
  urlPath: "/curriculo",
  title: `Currículo | ${initialResumeData.profile.name || "Pedro Henrique Almeida"}`,
  description: `Currículo acadêmico e profissional de ${initialResumeData.profile.name || "Pedro Henrique Almeida"} - Engenharia Física UFLA, Óptica e Instrumentação Científica.`,
  type: "website",
  ogImage: `${BASE_URL}/og-home.svg`,
  jsonLd: personJsonLd,
  prerenderContent: `
    <main>
      <h1>Currículo de ${initialResumeData.profile.name || "Pedro Henrique Almeida"}</h1>
      <p>${initialResumeData.profile.title || ""}</p>
      <p>${initialResumeData.profile.bio || ""}</p>
      <section>
        <h2>Experiência de Pesquisa & Laboratório</h2>
        ${(initialResumeData.experiences || []).map(e => `
          <article>
            <h3>${e.role || ""} - ${e.company || ""}</h3>
            <p>${formatDates(e.startDate, e.endDate, e.current)} | ${e.location || ""}</p>
            <p>${e.description || ""}</p>
          </article>
        `).join("")}
      </section>
      <section>
        <h2>Formação Acadêmica</h2>
        ${(initialResumeData.educations || []).map(e => `
          <article>
            <h3>${e.degree || ""} - ${e.institution || ""}</h3>
            <p>${formatDates(e.startDate, e.endDate, e.current)}</p>
            <p>${e.description || ""}</p>
          </article>
        `).join("")}
      </section>
    </main>
  `
});

// 2. Blog Listing Route
routes.push({
  urlPath: "/blog",
  title: `Blog & Artigos | ${initialResumeData.profile.name || "Pedro Henrique Almeida"}`,
  description: "Artigos e notas técnicas sobre física computacional, óptica ultrarrápida, instrumentação e automação experimental.",
  type: "website",
  ogImage: `${BASE_URL}/og-home.svg`,
  prerenderContent: `
    <main>
      <h1>Blog & Artigos de Física & Instrumentação</h1>
      <p>Acompanhe publicações, simulações numéricas e notas técnicas.</p>
      <section>
        ${publishedPosts.map(post => `
          <article>
            <h2><a href="/blog/${slugOf(post)}">${post.title || ""}</a></h2>
            <p>${post.summary || ""}</p>
            <time>${post.date || ""}</time>
          </article>
        `).join("")}
      </section>
    </main>
  `
});

// 3. Blog Post Routes
publishedPosts.forEach(post => {
  const authorName = initialResumeData.profile.name || "Pedro Henrique Almeida";
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title || "",
    "description": post.summary || "",
    "datePublished": post.date || "",
    "author": {
      "@type": "Person",
      "name": authorName
    },
    "publisher": {
      "@type": "Person",
      "name": authorName
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${slugOf(post)}`
    }
  };

  routes.push({
    urlPath: `/blog/${slugOf(post)}`,
    title: `${post.title || "Artigo"} | Blog de ${authorName}`,
    description: post.summary || "",
    type: "article",
    ogImage: post.imageUrl || `${BASE_URL}/og-home.svg`,
    jsonLd: blogJsonLd,
    prerenderContent: `
      <article>
        <header>
          <h1>${post.title || ""}</h1>
          <p>Publicado por ${authorName} em ${post.date || ""}</p>
        </header>
        <div>
          <p><strong>${post.summary || ""}</strong></p>
          <div>${(post.content || "").replace(/\n/g, "<br/>")}</div>
        </div>
      </article>
    `
  });
});

// 4. Project Routes
publishedProjects.forEach(project => {
  routes.push({
    urlPath: `/projetos/${slugOf(project)}`,
    title: `${project.title || "Projeto"} | Projetos de ${initialResumeData.profile.name || "Pedro Henrique Almeida"}`,
    description: project.description || "",
    type: "website",
    ogImage: project.imageUrl || `${BASE_URL}/og-home.svg`,
    prerenderContent: `
      <article>
        <h1>${project.title || ""}</h1>
        <p>${project.description || ""}</p>
        ${project.detailedDescription ? `<p>${project.detailedDescription}</p>` : ""}
        ${project.scientificRelevance ? `<section><h2>Relevância Científica</h2><p>${project.scientificRelevance}</p></section>` : ""}
      </article>
    `
  });

  // Alias for /project/:id
  routes.push({
    urlPath: `/project/${slugOf(project)}`,
    title: `${project.title || "Projeto"} | Projetos de ${initialResumeData.profile.name || "Pedro Henrique Almeida"}`,
    description: project.description || "",
    type: "website",
    ogImage: project.imageUrl || `${BASE_URL}/og-home.svg`,
    prerenderContent: `
      <article>
        <h1>${project.title || ""}</h1>
        <p>${project.description || ""}</p>
      </article>
    `
  });
});

// Write static HTML files for each route
routes.forEach(route => {
  const canonicalUrl = `${BASE_URL}${route.urlPath === "/" ? "" : route.urlPath}`;
  
  let headTags = `
    <title>${escapeXml(route.title || "")}</title>
    <meta name="description" content="${escapeXml(route.description || "")}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="pt-BR" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="en" href="${canonicalUrl}?lang=en" />
    <meta property="og:title" content="${escapeXml(route.title || "")}" />
    <meta property="og:description" content="${escapeXml(route.description || "")}" />
    <meta property="og:image" content="${route.ogImage}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="${route.type}" />
    <meta property="og:locale" content="pt_BR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeXml(route.title || "")}" />
    <meta name="twitter:description" content="${escapeXml(route.description || "")}" />
    <meta name="twitter:image" content="${route.ogImage}" />
  `;

  if (route.jsonLd) {
    headTags += `\n    <script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script>`;
  }

  let pageHtml = templateHtml.replace(/<title>.*?<\/title>/i, "");
  pageHtml = pageHtml.replace(/<head>/i, `<head>\n${headTags}`);
  pageHtml = pageHtml.replace(
    `<div id="root"></div>`,
    `<div id="root"><noscript>${route.prerenderContent}</noscript></div>`
  );

  let targetFilePath: string;
  if (route.urlPath === "/") {
    targetFilePath = path.join(DIST_DIR, "index.html");
  } else {
    const cleanRoute = route.urlPath.replace(/^\//, "");
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

// Generate sitemap.xml
const sitemapUrls = routes.map(r => {
  const loc = `${BASE_URL}${r.urlPath === "/" ? "" : r.urlPath}`;
  const priority = r.urlPath === "/" ? "1.0" : r.urlPath.startsWith("/blog/") ? "0.8" : "0.7";
  return `  <url>
    <loc>${loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join("\n");

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>`;

fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), sitemapXml, "utf-8");

// Generate static OG SVG banner for home
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f172a" />
  <circle cx="1100" cy="100" r="300" fill="#4f46e5" opacity="0.15" />
  <circle cx="100" cy="530" r="250" fill="#06b6d4" opacity="0.1" />
  <text x="80" y="220" font-family="sans-serif" font-size="52" font-weight="900" fill="#ffffff">${escapeXml(initialResumeData.profile.name || "Pedro Henrique Almeida")}</text>
  <text x="80" y="290" font-family="sans-serif" font-size="28" font-weight="600" fill="#818cf8">Engenharia Física - UFLA | Pesquisador CNPq</text>
  <text x="80" y="360" font-family="sans-serif" font-size="22" fill="#94a3b8">Óptica Ultrarrápida • Instrumentação Científica • Física Computacional</text>
  <rect x="80" y="440" width="340" height="60" rx="12" fill="#4f46e5" />
  <text x="250" y="478" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${BASE_URL.replace("https://", "")}</text>
</svg>`;

fs.writeFileSync(path.join(DIST_DIR, "og-home.svg"), ogSvg, "utf-8");
fs.writeFileSync(path.resolve(process.cwd(), "public/og-home.svg"), ogSvg, "utf-8");

console.log(`Prerender complete! ${routes.length} routes prerendered to dist/ with sitemap.xml, robots.txt, and metadata.`);

function escapeXml(unsafe: string | undefined | null): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
