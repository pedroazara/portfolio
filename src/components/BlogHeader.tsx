import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, LayoutDashboard, Moon, Sun } from "lucide-react";
import { localePath } from "../lib/routes";
import LanguageSwitcher from "./LanguageSwitcher";

interface BlogHeaderProps {
  language: "pt" | "en";
  onLanguageChange: (lang: "pt" | "en") => void;
  darkMode: boolean;
  onDarkModeToggle: () => void;
  isAuthenticated: boolean;
  isCollapsed?: boolean;
}

/**
 * Cabeçalho do blog, separado da navegação do portfólio.
 *
 * Com o menu do site (Currículo · Projetos · Blog) em cima de cada artigo, o
 * blog lia como mais uma aba da vitrine. Aqui ele tem nome próprio, e o
 * portfólio vira só um link discreto para quem quiser saber quem escreve.
 */
export default function BlogHeader({
  language,
  onLanguageChange,
  darkMode,
  onDarkModeToggle,
  isAuthenticated,
  isCollapsed = false,
}: BlogHeaderProps) {
  const isEn = language === "en";
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`no-print print:hidden sticky top-0 z-40 w-full transition-all duration-200 ease-in-out ${
        isCollapsed ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      } ${isScrolled ? "border-b border-borda bg-papel/90 backdrop-blur-md" : "border-b border-transparent bg-papel"}`}
      style={{ height: "var(--global-header-height, 64px)" }}
      role="banner"
    >
      {/* Mesmo recuo do conteúdo principal, para alinhar com a coluna de texto. */}
      <div className="h-full px-4 sm:px-8 lg:px-12">
      <div className="mx-auto flex h-full max-w-[42rem] items-center justify-between gap-3">
        <Link
          to={localePath("/blog", language)}
          className="min-w-0 whitespace-nowrap font-display text-[15px] tracking-tight sm:text-[17px] text-tinta rounded-md focus-visible:outline-2 focus-visible:outline-acento focus-visible:outline-offset-2"
          aria-label={isEn ? "Blog home" : "Início do blog"}
        >
          <span className="font-bold">Pedro Ázara</span>
          <span className="text-tinta-fraca"> / blog</span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Link
            to={localePath("/", language)}
            className="inline-flex items-center gap-0.5 whitespace-nowrap text-[13px] text-tinta-fraca underline-offset-4 transition-colors hover:text-tinta hover:underline"
          >
            {isEn ? "About me" : "Sobre mim"}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <LanguageSwitcher language={language} onChange={onLanguageChange} alwaysVisible />

          <button
            type="button"
            onClick={onDarkModeToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-tinta-fraca transition-colors hover:bg-superficie-alta hover:text-tinta cursor-pointer"
            aria-label={darkMode ? "Ativar tema claro" : "Ativar tema escuro"}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Visitantes não precisam ver a entrada administrativa aqui. */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate(localePath("/admin/painel", language))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-tinta-fraca transition-colors hover:bg-superficie-alta hover:text-tinta cursor-pointer"
              title="Painel pessoal"
              aria-label="Painel pessoal"
            >
              <LayoutDashboard className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
