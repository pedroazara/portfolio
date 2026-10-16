import type { Project, ProjectCategory } from "../types";
import type { Language } from "./translations";

/**
 * Nomes das áreas (categorias) de um projeto, no idioma pedido e na ordem do
 * projeto — a primeira é a principal.
 *
 * É o que acompanha o projeto fora da própria página (currículo em PDF,
 * projetos citados num artigo). Antes iam as tecnologias, que eram etiquetas
 * soltas em português e nunca apareciam traduzidas; as categorias já têm
 * `nameEn`, preenchido pela tradução do painel.
 */
export function projectAreaNames(project: Project, categories: ProjectCategory[], language: Language): string[] {
  const ids = project.categoryIds?.length ? project.categoryIds : project.categoryId ? [project.categoryId] : [];
  return ids
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is ProjectCategory => Boolean(c))
    .map((c) => ((language === "en" && c.nameEn) || c.name).trim())
    .filter(Boolean);
}
