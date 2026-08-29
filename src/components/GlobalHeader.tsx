import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Download, Sun, Moon, Menu, X, Lock, ChevronDown, ArrowRight, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { OrbitaIcon } from "./OrbitaIcon";
import { generateResumePDF } from "../utils/pdfGenerator";
import { stripLocale, localePath } from "../lib/routes";
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

  // `path` é sempre o caminho canônico em português; `localePath` o converte
  // para a URL real do idioma ativo (`/curriculo` ou `/en/resume`).
  const navItems = [
    { label: language === "en" ? "Resume" : "Currículo", path: "/curriculo" },
    { label: language === "en" ? "Projects" : "Projetos", path: "/projetos" },
    { label: language === "en" ? "Blog" : "Blog", path: "/blog" },
  ];

  const { path: routePath } = stripLocale(location.pathname);

  // Helper to test active route
  const isRouteActive = (path: string) => {
    if (path === "/curriculo") {
      // A home é página própria agora; só "/curriculo" acende este item.
      return routePath === "/curriculo";
    }
    if (path === "/projetos") {
      return routePath.startsWith("/projetos") || routePath.startsWith("/project");
    }
    if (path === "/blog") {
      return routePath.startsWith("/blog");
    }
    return false;
  };

  const handleDownloadCV = () => {
    if (onOpenPdfPreview) {
      onOpenPdfPreview();
    } else {
      generateResumePDF(resumeData).catch((err) => console.error("Erro ao gerar PDF:", err));
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
            ? "border-b border-borda bg-superficie/90 backdrop-blur-md shadow-xs"
            : "border-b border-transparent bg-superficie"
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
                to={localePath("/", language)}
                className="group orb-hover flex items-center gap-2.5 rounded-full focus-visible:outline-2 focus-visible:outline-acento focus-visible:outline-offset-2 hover:opacity-95 transition-opacity"
                aria-label={language === "en" ? "Go to home page" : "Ir para a página inicial"}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-acento text-white p-0.5 shrink-0 shadow-xs">
                  <OrbitaIcon size={38} color="#ffffff" />
                </div>
                <span className="hidden sm:inline-block text-[16px] font-bold tracking-tight text-tinta font-display">
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
                    to={localePath(item.path, language)}
                    aria-current={active ? "page" : undefined}
                    className={`relative px-3 py-2 text-[14.5px] rounded-[7px] transition-colors duration-160 font-sans cursor-pointer ${
                      active
                        ? "text-tinta font-[550]"
                        : "text-tinta-fraca hover:text-tinta hover:bg-superficie-alta"
                    }`}
                  >
                    {item.label}
                    {/* Active 2px bottom accent indicator — desliza entre os itens ao trocar de rota */}
                    {active && (
                      <motion.span
                        layoutId="nav-active-indicator"
                        className="absolute bottom-0 left-[12px] right-[12px] h-[2px] bg-acento rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Zone 3: Utilities & Primary CTA */}
            <div className="flex items-center gap-[8px]">
              {/* Segmented Language Selector PT | EN */}
              <div className="hidden min-[860px]:flex items-center rounded-lg bg-superficie-alta p-0.5 border border-borda-forte">
                <button
                  type="button"
                  onClick={() => changeLanguage("pt")}
                  className={`relative rounded-md px-2 py-1 text-[12px] font-bold transition-colors cursor-pointer ${
                    language === "pt" ? "text-acento" : "text-tinta-fraca hover:text-tinta"
                  }`}
                  aria-label="Mudar idioma para Português"
                >
                  {language === "pt" && (
                    <motion.span
                      layoutId="lang-pill-desktop"
                      className="absolute inset-0 rounded-md bg-superficie shadow-xs"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative">PT</span>
                </button>
                <button
                  type="button"
                  onClick={() => changeLanguage("en")}
                  className={`relative rounded-md px-2 py-1 text-[12px] font-bold transition-colors cursor-pointer ${
                    language === "en" ? "text-acento" : "text-tinta-fraca hover:text-tinta"
                  }`}
                  aria-label="Change language to English"
                >
                  {language === "en" && (
                    <motion.span
                      layoutId="lang-pill-desktop"
                      className="absolute inset-0 rounded-md bg-superficie shadow-xs"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative">EN</span>
                </button>
              </div>

              {/* Theme Toggle Button (Icon-only 32px) */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className="hidden min-[860px]:flex h-8 w-8 items-center justify-center rounded-lg border border-borda bg-superficie text-tinta-fraca hover:bg-superficie-alta hover:text-tinta transition-colors cursor-pointer"
                aria-label={darkMode ? "Ativar tema claro" : "Ativar tema escuro"}
              >
                {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-acento" />}
              </button>

              {/* Painel pessoal: área privada, só faz sentido com sessão ativa */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => navigate(localePath("/admin/painel", language))}
                  className="hidden min-[860px]:flex h-8 items-center gap-1.5 rounded-lg border border-borda bg-superficie px-2.5 text-[12px] font-medium text-tinta-fraca transition-colors hover:bg-superficie-alta hover:text-tinta cursor-pointer"
                  title="Painel pessoal" aria-label="Painel pessoal"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Painel</span>
                </button>
              )}

              {/* Admin Button */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenLogin) onOpenLogin();
                  else navigate(localePath("/admin", language));
                }}
                className={`hidden min-[860px]:flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors cursor-pointer ${
                  isAuthenticated
                    ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "border-borda bg-superficie text-tinta-fraca hover:bg-superficie-alta hover:text-tinta"
                }`}
                title={isAuthenticated ? "Modo Admin Ativo" : "Acessar Área de Administração"} aria-label={isAuthenticated ? "Modo Admin Ativo" : "Acessar Área de Administração"}
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
                  className="flex items-center gap-1.5 rounded-lg bg-acento hover:opacity-90 px-3.5 py-2 text-[13px] font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
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
                className="min-[860px]:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-borda bg-superficie-alta text-tinta cursor-pointer"
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
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="no-print print:hidden min-[860px]:hidden fixed inset-0 z-50 flex flex-col bg-superficie text-tinta font-sans"
          >
          <div className="flex h-[56px] items-center justify-between border-b border-borda px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-acento text-white p-0.5 shrink-0 shadow-xs">
                <OrbitaIcon size={34} color="#ffffff" />
              </div>
              <span className="text-base font-bold font-display">Pedro Ázara</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-tinta-fraca hover:text-tinta cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            <nav className="flex flex-col space-y-2" aria-label="Navegação mobile">
              {navItems.map((item) => {
                const active = isRouteActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={localePath(item.path, language)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                      active
                        ? "bg-acento-suave text-acento font-bold"
                        : "text-tinta-fraca hover:bg-superficie-alta"
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-borda pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-tinta-fraca">
                  {language === "en" ? "Language" : "Idioma"}
                </span>
                <div className="relative flex rounded-lg bg-superficie-alta p-1 border border-borda-forte">
                  <button
                    type="button"
                    onClick={() => changeLanguage("pt")}
                    className={`relative rounded-md px-3 py-1.5 text-xs font-bold ${
                      language === "pt" ? "text-acento" : "text-tinta-fraca"
                    }`}
                  >
                    {language === "pt" && (
                      <motion.span
                        layoutId="lang-pill-mobile"
                        className="absolute inset-0 rounded-md bg-superficie shadow-xs"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative">Português (PT)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLanguage("en")}
                    className={`relative rounded-md px-3 py-1.5 text-xs font-bold ${
                      language === "en" ? "text-acento" : "text-tinta-fraca"
                    }`}
                  >
                    {language === "en" && (
                      <motion.span
                        layoutId="lang-pill-mobile"
                        className="absolute inset-0 rounded-md bg-superficie shadow-xs"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative">English (EN)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-tinta-fraca">
                  {language === "en" ? "Theme" : "Tema"}
                </span>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="flex items-center gap-2 rounded-lg border border-borda bg-superficie-alta px-3 py-1.5 text-xs font-semibold text-tinta cursor-pointer"
                >
                  {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-acento" />}
                  <span>{darkMode ? "Claro" : "Escuro"}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-tinta-fraca">
                  {language === "en" ? "Administration" : "Administração"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onOpenLogin) onOpenLogin();
                    else navigate(localePath("/admin", language));
                  }}
                  className="flex items-center gap-2 rounded-lg border border-borda bg-superficie-alta px-3 py-1.5 text-xs font-semibold text-tinta cursor-pointer"
                >
                  <Lock className="h-4 w-4 text-indigo-500" />
                  <span>{isAuthenticated ? (language === "en" ? "Admin Mode" : "Modo Admin") : "Admin"}</span>
                </button>
              </div>

              {isAuthenticated && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-tinta-fraca">
                    {language === "en" ? "Personal hub" : "Painel pessoal"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate(localePath("/admin/painel", language));
                    }}
                    className="flex items-center gap-2 rounded-lg border border-borda bg-superficie-alta px-3 py-1.5 text-xs font-semibold text-tinta cursor-pointer"
                  >
                    <LayoutDashboard className="h-4 w-4 text-indigo-500" />
                    <span>{language === "en" ? "Open" : "Abrir"}</span>
                  </button>
                </div>
              )}

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleDownloadCV();
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-acento py-3 text-sm font-bold text-white shadow-md active:scale-95 transition-transform"
                >
                  <Download className="h-4 w-4" />
                  <span>{language === "en" ? "Download Curriculum PDF" : "Baixar Currículo em PDF"}</span>
                </button>
              )}
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
