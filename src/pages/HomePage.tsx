import React from "react";
import { Profile, Project, ProjectCategory, BlogPost } from "../types";
import ResumeHeader from "../components/ResumeHeader";
import ProjetosEmDestaque from "../components/ProjetosEmDestaque";
import UltimosArtigos from "../components/UltimosArtigos";
import { Language } from "../lib/translations";

interface HomePageProps {
  profile: Profile;
  projects: Project[];
  categories: ProjectCategory[];
  posts: BlogPost[];
  isEditMode: boolean;
  onUpdateProfile: (updated: Profile) => void;
  isAuthenticated: boolean;
  onOpenPdfPreview: () => void;
  language: Language;
  stats: { projetos: number; pesquisa: number; habilidades: number };
}

/**
 * A porta de entrada do site: apresentação, trabalho em destaque, artigos.
 *
 * Antes `/` e `/curriculo` eram a mesma página — currículo completo, com seis
 * seções do mesmo peso, projetos só depois de formação e experiência. Quem
 * chegava por um link queria ver trabalho, e encontrava datas de graduação.
 *
 * Agora a home é vitrine: a apresentação de sempre, seguida do que há de mais
 * relevante para mostrar. O currículo completo — formação, pesquisa,
 * atividades, habilidades, certificações — mudou para `/curriculo`, que o
 * menu já levava a essa URL antes mesmo de existir como página própria.
 */
export default function HomePage({
  profile,
  projects,
  categories,
  posts,
  isEditMode,
  onUpdateProfile,
  isAuthenticated,
  onOpenPdfPreview,
  language,
  stats,
}: HomePageProps) {
  return (
    <div className="space-y-10 print:space-y-6">
      <ResumeHeader
        profile={profile}
        isEditMode={isEditMode}
        onUpdateProfile={onUpdateProfile}
        language={language}
        isAuthenticated={isAuthenticated}
        onOpenPdfPreview={onOpenPdfPreview}
        stats={stats}
      />

      <ProjetosEmDestaque projects={projects} categories={categories} language={language} />

      <UltimosArtigos posts={posts} language={language} />
    </div>
  );
}
