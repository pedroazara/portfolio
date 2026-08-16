import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Copy, Check, Tag } from "lucide-react";
import { ResumeData, BlogPost, Project } from "../types";
import { Orbita } from "./WaveIcon";
import { localePath, stripLocale } from "../lib/routes";

interface SectionHeaderProps {
  resumeData?: ResumeData;
  projectCategories?: any[];
  categories?: any[];
  language?: "pt" | "en";
  isAuthenticated?: boolean;
  isGlobalCollapsed?: boolean;
  onSearchChange?: (query: string) => void;
  searchQuery?: string;
}

export default function SectionHeader({
  resumeData,
  projectCategories,
  categories,
  language = "pt",
  isAuthenticated = false,
  isGlobalCollapsed = false,
  onSearchChange,
  searchQuery = "",
}: SectionHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active curriculum anchor section state
  const [activeCurriculumSection, setActiveCurriculumSection] = useState<string>("perfil");
  const [readProgress, setReadProgress] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { path: routePath } = stripLocale(location.pathname);
  const isHomeOrCv = routePath === "/" || routePath === "/curriculo";
  const isBlogList = routePath === "/blog";
  const isBlogPost = routePath.startsWith("/blog/") && routePath !== "/blog";
  const isProjectsList = routePath === "/projetos";
  const isProjectDetail = routePath.startsWith("/projetos/") || routePath.startsWith("/project/");

  // Extract Blog Post ID
  let blogPost: BlogPost | null = null;
  if (isBlogPost) {
    const match = routePath.match(/^\/blog\/(.+)$/);
    if (match && match[1]) {
      const id = decodeURIComponent(match[1]);
      blogPost = resumeData.posts.find((p) => p.id === id) || null;
    }
  }

  // Extract Project ID
  let projectItem: Project | null = null;
  if (isProjectDetail) {
    const match = routePath.match(/^\/(?:projetos|project)\/(.+)$/);
    if (match && match[1]) {
      const id = decodeURIComponent(match[1]);
      projectItem = resumeData.projects.find((p) => p.id === id) || null;
    }
  }

  // 1. Curriculum Intersection Observer & Scroll Progress
  useEffect(() => {
    if (!isHomeOrCv && !isBlogPost) return;

    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? Math.min(100, Math.max(0, Math.round((winScroll / height) * 100))) : 0;
      setReadProgress(scrolled);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomeOrCv, isBlogPost]);

  // Section observer for /curriculo
  useEffect(() => {
    if (!isHomeOrCv) return;

    const sectionIds = ["perfil", "formacao", "pesquisa", "projetos", "habilidades", "certificacoes"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCurriculumSection(entry.target.id);
            // Scroll active pill into center view in mobile horizontal bar
            const pill = document.getElementById(`nav-pill-${entry.target.id}`);
            pill?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          }
        });
      },
      {
        rootMargin: "-64px 0px -70% 0px", // triggers when top of section enters upper portion
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [isHomeOrCv]);

  // Handle anchor smooth click
  const handleAnchorClick = (id: string) => {
    setActiveCurriculumSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Copy blog post link
  const handleCopyPostLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Don't render SectionHeader on routes where no internal section navigation exists
  if (!isHomeOrCv && !isBlogList && !isBlogPost && !isProjectsList && !isProjectDetail) {
    return null;
  }

  // Calculate top offset depending on admin bar and global header collapsed state
  let topStyle = "top-0";
  if (isAuthenticated) {
    topStyle = isGlobalCollapsed ? "top-[40px]" : "top-[104px]";
  } else {
    topStyle = isGlobalCollapsed ? "top-0" : "top-[64px]";
  }

  // Categories & counts for /blog
  const blogPosts = (resumeData?.posts || []).filter((p: any) => !p.draft);
  const categoriesMap: Record<string, number> = { Todos: blogPosts.length };
  blogPosts.forEach((post) => {
    const cat = post.category || "Geral & Divulgação";
    categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
  });

  const activeCategory = searchParams.get("categoria") || "Todos";

  const handleSelectCategory = (cat: string) => {
    if (cat === "Todos") {
      searchParams.delete("categoria");
    } else {
      searchParams.set("categoria", cat);
    }
    setSearchParams(searchParams);
  };

  // Categories & counts for /projetos
  const areaCategories = ["Todos", "Física Computacional", "Instrumentação", "Ciência dos Materiais"];
  const activeAreaCategory = searchParams.get("area") || "Todos";
  const handleSelectAreaCategory = (cat: string) => {
    if (cat === "Todos") {
      searchParams.delete("area");
    } else {
      searchParams.set("area", cat);
    }
    setSearchParams(searchParams);
  };

  const curriculumAnchors = [
    { id: "perfil", label: language === "en" ? "Profile" : "Perfil" },
    { id: "formacao", label: language === "en" ? "Education" : "Formação" },
    { id: "pesquisa", label: language === "en" ? "Research" : "Pesquisa" },
    { id: "projetos", label: language === "en" ? "Projects" : "Projetos" },
    { id: "habilidades", label: language === "en" ? "Skills" : "Habilidades" },
    { id: "certificacoes", label: language === "en" ? "Certifications" : "Certificações" },
  ];

  return (
    <nav
      className={`no-print print:hidden sticky ${topStyle} z-30 flex h-[46px] w-full items-center border-b border-[var(--border)] bg-[var(--surface-raised)] transition-all duration-200 font-sans text-xs select-none`}
      aria-label="Seções desta página"
    >
      {/* Background progress bar for reading */}
      {(isHomeOrCv || isBlogPost) && (
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-[var(--accent)] transition-all duration-150"
          style={{ width: `${readProgress}%` }}
        />
      )}

      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        
        {/* If global header is collapsed, show mini 32px Orbita logo on left */}
        {isGlobalCollapsed && (
          <Link
            to={localePath("/", language)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white mr-3 shadow-xs"
            title="Voltar ao topo"
          >
            <Orbita size={22} color="#ffffff" />
          </Link>
        )}

        {/* --- SCENARIO 1: /curriculo --- */}
        {isHomeOrCv && (
          <>
            {/* Scrollable anchors with fade masks */}
            <div
              ref={scrollContainerRef}
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 scroll-smooth snap-x text-xs"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {curriculumAnchors.map((item) => {
                const isActive = activeCurriculumSection === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-pill-${item.id}`}
                    type="button"
                    onClick={() => handleAnchorClick(item.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`snap-start whitespace-nowrap rounded-[6px] px-3 py-1 font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] font-bold"
                        : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Right side: Monospace progress reading percentage */}
            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)] shrink-0 ml-4">
              <span>{readProgress}% {language === "en" ? "read" : "lido"}</span>
            </div>
          </>
        )}

        {/* --- SCENARIO 2: /blog --- */}
        {isBlogList && (
          <>
            <div
              className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 scroll-smooth snap-x text-xs"
              style={{ scrollbarWidth: "none" }}
            >
              {Object.entries(categoriesMap).map(([catName, count]) => {
                if (count === 0 && catName !== "Todos") return null;
                const isActive = activeCategory === catName;
                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => handleSelectCategory(catName)}
                    className={`snap-start whitespace-nowrap rounded-full px-3 py-1 font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[var(--accent)] text-white shadow-xs"
                        : "bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
                    }`}
                  >
                    {catName} <span className="opacity-80 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Right side: Compact expandable search */}
            <div className="flex items-center shrink-0 ml-3">
              <div
                className={`flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 transition-all ${
                  isSearchFocused ? "w-48 border-[var(--accent)] ring-1 ring-[var(--accent)]" : "w-32 sm:w-40"
                }`}
              >
                <Search className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0 mr-1.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={language === "en" ? "Search posts..." : "Buscar artigos..."}
                  className="w-full bg-transparent font-sans text-[11px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
                />
              </div>
            </div>
          </>
        )}

        {/* --- SCENARIO 3: /blog/[slug] --- */}
        {isBlogPost && (
          <>
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <Link
                to={localePath("/blog", language)}
                className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text)] font-semibold transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{language === "en" ? "Blog" : "Blog"}</span>
              </Link>

              {blogPost && (
                <span className="hidden sm:inline-block truncate text-[11px] font-medium text-[var(--text-muted)] border-l border-[var(--border)] pl-3">
                  {language === "en" ? blogPost.titleEn || blogPost.title : blogPost.title}
                </span>
              )}
            </div>

            {/* Right side: Estimated reading time + Copy Link */}
            <div className="flex items-center gap-3 shrink-0">
              {blogPost?.readTime && (
                <span className="hidden sm:inline-block font-mono text-[11px] text-[var(--text-muted)]">
                  {blogPost.readTime}
                </span>
              )}

              <button
                type="button"
                onClick={handleCopyPostLink}
                className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-semibold text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-500 text-[11px]">{language === "en" ? "Copied!" : "Copiado!"}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-[11px]">{language === "en" ? "Copy link" : "Copiar link"}</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* --- SCENARIO 4: /projetos --- */}
        {isProjectsList && (
          <>
            <div
              className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 scroll-smooth snap-x text-xs"
              style={{ scrollbarWidth: "none" }}
            >
              {areaCategories.map((cat) => {
                const isActive = activeAreaCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelectAreaCategory(cat)}
                    className={`snap-start whitespace-nowrap rounded-full px-3 py-1 font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[var(--accent)] text-white shadow-xs"
                        : "bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex items-center font-mono text-[11px] text-[var(--text-muted)] shrink-0 ml-3">
              <span>{resumeData.projects.length} {language === "en" ? "projects" : "projetos"}</span>
            </div>
          </>
        )}

        {/* --- SCENARIO 5: /projetos/[slug] or /project/[slug] --- */}
        {isProjectDetail && (
          <>
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <Link
                to={localePath("/projetos", language)}
                className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text)] font-semibold transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{language === "en" ? "Projects" : "Projetos"}</span>
              </Link>

              {projectItem && (
                <span className="hidden sm:inline-block truncate text-[11px] font-medium text-[var(--text-muted)] border-l border-[var(--border)] pl-3">
                  {language === "en" ? projectItem.titleEn || projectItem.title : projectItem.title}
                </span>
              )}
            </div>

            {/* Right side: Tech tags as chips */}
            {projectItem?.tags && (
              <div className="hidden md:flex items-center gap-1 overflow-x-auto shrink-0">
                {projectItem.tags.slice(0, 4).map((tech, idx) => (
                  <span
                    key={`tech-${tech}-${idx}`}
                    className="inline-flex items-center gap-1 rounded bg-[var(--surface)] px-2 py-0.5 text-[10px] font-mono font-medium text-[var(--text-muted)] border border-[var(--border)]"
                  >
                    <Tag className="h-2.5 w-2.5 text-[var(--accent)]" />
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </nav>
  );
}
