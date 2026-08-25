import React from "react";
import { Github, ExternalLink, BookOpen } from "lucide-react";
import { Project } from "../types";
import { Language } from "../lib/translations";

interface LinksDoProjetoProps {
  project: Project;
  language?: Language;
  /**
   * `barra` empilha os links na coluna lateral, cada um ocupando a largura
   * toda; `linha` os deixa lado a lado, para quando aparecem dentro do texto.
   */
  formato?: "barra" | "linha";
}

/**
 * Para onde o projeto leva: código, demonstração, documentação.
 *
 * São as saídas do projeto, e não parte da leitura — por isso moram na coluna
 * da direita, junto da lista dos outros projetos, onde ficam à mão o tempo
 * todo em vez de passar uma vez só perto do começo do texto.
 *
 * Em telas sem a coluna lateral o mesmo componente aparece no corpo, em linha:
 * esconder os links no celular seria pior do que mostrá-los fora do lugar
 * ideal.
 */
export default function LinksDoProjeto({
  project,
  language = "pt",
  formato = "linha",
}: LinksDoProjetoProps) {
  const isEn = language === "en";
  const documentacao = project.documentationUrl || project.paperUrl;

  if (!project.githubUrl && !project.projectUrl && !documentacao) return null;

  const emBarra = formato === "barra";
  const base = emBarra
    ? "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors"
    : "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors";

  const solido = "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700";
  const vazado = "border border-borda text-tinta-suave hover:bg-superficie-alta hover:text-tinta";

  return (
    <div className={emBarra ? "flex flex-col gap-2" : "mt-6 flex flex-wrap gap-2"}>
      {project.githubUrl && (
        <a
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} ${solido}`}
        >
          <Github className="h-3.5 w-3.5 shrink-0" />
          {isEn ? "Source code" : "Código-fonte"}
        </a>
      )}

      {project.projectUrl && (
        <a
          href={project.projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} ${vazado}`}
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          {isEn ? "Live demo" : "Ver funcionando"}
        </a>
      )}

      {documentacao && (
        <a
          href={documentacao}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} ${vazado}`}
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          {isEn ? "Documentation" : "Documentação"}
        </a>
      )}
    </div>
  );
}
