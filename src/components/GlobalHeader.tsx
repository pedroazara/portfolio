import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Download, Sun, Moon, Menu, X, Lock, ChevronDown, ArrowRight } from "lucide-react";
import { OrbitaIcon } from "./OrbitaIcon";
import { generateResumePDF } from "../utils/pdfGenerator";
import { ResumeData } from "../types";

interface GlobalHeaderProps {
  darkMode?: boolean;
  onDarkModeToggle?: () => void;
  onToggleDarkMode?: () => void;
  language?: "pt" | "en";
  onLanguageChange?: (lang: "pt" | "en") => void;
  onSetLanguage?: (lang: "pt" | "en") => void;
  isAuthenticated?: boolean;
  onOpenLogin?: () => void;
  onOpenPdfPreview?: () => void;
  resumeData?: ResumeData;
  badgeIconUrl?: string;
  authorName?: string;
  authorTitle?: string;
  isCollapsed?: boolean;
}

export default function GlobalHeader({
  darkMode = false,
  onDarkModeToggle,
  onToggleDarkMode,
  language = "pt",
  onLanguageChange,
  onSetLanguage,
  isAuthenticated = false,
  onOpenLogin,
  onOpenPdfPreview,
  resumeData,
  badgeIconUrl,
  authorName = "Pedro Henrique Almeida",
  authorTitle = "Engenharia Física — UFLA",
  isCollapsed = false,
}: GlobalHeaderProps) {
  const toggleDarkMode = onDarkModeToggle || onToggleDarkMode || (() => {});
  const changeLanguage = onLanguageChange || onSetLanguage || (() => {});
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor scroll distance for backdrop blur & bottom border
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { label: language === "en" ? "Curriculum" : "Currículo", path: "/curriculo" },
    { label: language === "en" ? "Projects" : "Projetos", path: "/projetos" },
    { label: language === "en" ? "Blog" : "Blog", path: "/blog" },
  ];

  // Helper to test active route
  const isRouteActive = (path: string) => {
    if (path === "/curriculo") {
      return location.pathname === "/" || location.pathname === "/curriculo";
    }
    if (path === "/projetos") {
      return location.pathname.startsWith("/projetos") || location.pathname.startsWith("/project");
    }
    if (path === "/blog") {
      return location.pathname.startsWith("/blog");
    }
    return false;
  };

  const handleDownloadCV = () => {
    if (onOpenPdfPreview) {
      onOpenPdfPreview();
    } else {
      generateResumePDF(resumeData);
    }
  };

  const topOffset = isAuthenticated ? "top-[40px]" : "top-0";

  return (
    <>
      <header
        className={`no-print print:hidden sticky ${topOffset} z-40 w-full transition-all duration-200 ease-in-out ${
          isCollapsed ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        } ${
          isScrolled
            ? "border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md shadow-xs"
            : "border-b border-transparent bg-[var(--surface)]"
        }`}
        style={{ height: "var(--global-header-height, 64px)" }}
        role="banner"
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Main 3-zone container with 20px gap between zones, 8px inside */}
          <div className="flex w-full items-center justify-between gap-[20px]">
            
            {/* Zone 1: Brand */}
            <div className="flex items-center gap-[8px] shrink-0">
              <Link
                to="/"
                className="group orb-hover flex items-center gap-2.5 rounded-full focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 hover:opacity-95 transition-opacity"
                aria-label="Ir para a página inicial"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-white p-0.5 shrink-0 shadow-xs">
                  <OrbitaIcon size={38} color="#ffffff" />
                </div>
                <span className="hidden sm:inline-block text-[16px] font-bold tracking-tight text-[var(--text)] font-display">
                  Pedro Ázara
                </span>
              </Link>
            </div>

            {/* Zone 2: Navigation Links (Desktop >= 860px) */}
            <nav
              className="hidden min-[860px]:flex items-center gap-[8px] relative"
              aria-label="Navegação principal"
            >
              {navItems.map((item) => {
                const active = isRouteActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? "page" : undefined}
                    className={`relative px-3 py-2 text-[14.5px] rounded-[7px] transition-colors duration-160 font-sans cursor-pointer ${
                      active
                        ? "text-[var(--text)] font-[550]"
                        : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)]"
                    }`}
                  >
                    {item.label}
                    {/* Active 2px bottom accent indicator */}
                    {active && (
                      <span className="absolute bottom-0 left-[12px] right-[12px] h-[2px] bg-[var(--accent)] rounded-full transition-all duration-160" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Zone 3: Utilities & Primary CTA */}
            <div className="flex items-center gap-[8px]">
              {/* Segmented Language Selector PT | EN */}
              <div className="hidden min-[860px]:flex items-center rounded-lg bg-[var(--surface-raised)] p-0.5 border border-[var(--border-strong)]">
                <button
                  type="button"
                  onClick={() => changeLanguage("pt")}
                  className={`rounded-md px-2 py-1 text-[12px] font-bold transition-all cursor-pointer ${
                    language === "pt"
                      ? "bg-[var(--surface)] text-[var(--accent)] shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  aria-label="Mudar idioma para Português"
                >
                  PT
                </button>
                <button
                  type="button"
                  onClick={() => changeLanguage("en")}
                  className={`rounded-md px-2 py-1 text-[12px] font-bold transition-all cursor-pointer ${
                    language === "en"
                      ? "bg-[var(--surface)] text-[var(--accent)] shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  aria-label="Change language to English"
                >
                  EN
                </button>
              </div>

              {/* Theme Toggle Button (Icon-only 32px) */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className="hidden min-[860px]:flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] transition-colors cursor-pointer"
                aria-label={darkMode ? "Ativar tema claro" : "Ativar tema escuro"}
              >
                {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[var(--accent)]" />}
              </button>

              {/* Admin Button */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenLogin) onOpenLogin();
                  else navigate("/admin");
                }}
                className={`hidden min-[860px]:flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors cursor-pointer ${
                  isAuthenticated
                    ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                }`}
                title={isAuthenticated ? "Modo Admin Ativo" : "Acessar Área de Administração"}
                id="header-admin-login-btn"
              >
                <Lock className="h-3.5 w-3.5 text-indigo-500" />
                <span>{isAuthenticated ? (language === "en" ? "Admin Mode" : "Modo Admin") : "Admin"}</span>
              </button>

              {/* Primary CTA: Baixar CV (Solid Button) - ONLY when logged in */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleDownloadCV}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 px-3.5 py-2 text-[13px] font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                  id="global-download-cv-cta"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span>{language === "en" ? "Download CV" : "Baixar CV"}</span>
                </button>
              )}

              {/* Mobile Drawer Trigger (< 860px) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="min-[860px]:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] cursor-pointer"
                aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu de navegação"}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer Panel */}
      {isMobileMenuOpen && (
        <div className="no-print print:hidden min-[860px]:hidden fixed inset-0 z-50 flex flex-col bg-[var(--surface)] text-[var(--text)] font-sans animate-in fade-in duration-150">
          <div className="flex h-[56px] items-center justify-between border-b border-[var(--border)] px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white p-0.5 shrink-0 shadow-xs">
                <OrbitaIcon size={34} color="#ffffff" />
              </div>
              <span className="text-base font-bold font-display">Pedro Ázara</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <nav className="flex flex-col space-y-2" aria-label="Navegação mobile">
              {navItems.map((item) => {
                const active = isRouteActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] font-bold"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[var(--border)] pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-muted)]">
                  {language === "en" ? "Language" : "Idioma"}
                </span>
                <div className="flex rounded-lg bg-[var(--surface-raised)] p-1 border border-[var(--border-strong)]">
                  <button
                    type="button"
                    onClick={() => changeLanguage("pt")}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                      language === "pt"
                        ? "bg-[var(--surface)] text-[var(--accent)] shadow-xs"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    Português (PT)
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLanguage("en")}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                      language === "en"
                        ? "bg-[var(--surface)] text-[var(--accent)] shadow-xs"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    English (EN)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-muted)]">
                  {language === "en" ? "Theme" : "Tema"}
                </span>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] cursor-pointer"
                >
                  {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[var(--accent)]" />}
                  <span>{darkMode ? "Claro" : "Escuro"}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-[var(--text-muted)]">
                  {language === "en" ? "Administration" : "Administração"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onOpenLogin) onOpenLogin();
                    else navigate("/admin");
                  }}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] cursor-pointer"
                >
                  <Lock className="h-4 w-4 text-indigo-500" />
                  <span>{isAuthenticated ? (language === "en" ? "Admin Mode" : "Modo Admin") : "Admin"}</span>
                </button>
              </div>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleDownloadCV();
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-md active:scale-95 transition-transform"
                >
                  <Download className="h-4 w-4" />
                  <span>{language === "en" ? "Download Curriculum PDF" : "Baixar Currículo em PDF"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
