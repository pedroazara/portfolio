import React, { useState } from "react";
import { Experience, AcademicActivity, Education, Project } from "../types";
import ConfirmModal from "./ConfirmModal";
import FormacaoCard from "./FormacaoCard";
import ExperienciasCard from "./ExperienciasCard";
import AtividadesCard from "./AtividadesCard";
import { Language } from "../lib/translations";

interface ExperienceEducationSectionProps {
  experiences: Experience[];
  academicActivities?: AcademicActivity[];
  educations: Education[];
  projects?: Project[];
  isEditMode: boolean;
  onUpdateExperiences: (updated: Experience[]) => void;
  onUpdateAcademicActivities?: (updated: AcademicActivity[]) => void;
  onUpdateEducations: (updated: Education[]) => void;
  language?: Language;
}

/**
 * As três listas do meio do currículo, na ordem em que se lê.
 *
 * Isto já foi um arquivo de 1.600 linhas com formação, pesquisa e atividades
 * acadêmicas juntas: três listas independentes, cada uma com seu estado, seu
 * formulário e seu modal, que só dividiam duas coisas — o formato das datas e
 * o pedido de confirmação ao excluir. As datas viraram um módulo
 * (`lib/periodo`); a confirmação continua aqui, porque um modal só, no topo,
 * evita três diálogos concorrentes na tela.
 *
 * Cada seção agora mora no próprio arquivo, e uma mudança em formação não
 * esbarra no formulário de pesquisa.
 */
export default function ExperienceEducationSection({
  experiences,
  academicActivities = [],
  educations,
  projects = [],
  isEditMode,
  onUpdateExperiences,
  onUpdateAcademicActivities,
  onUpdateEducations,
  language = "pt",
}: ExperienceEducationSectionProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");

  /** Abre a confirmação de exclusão em nome de qualquer uma das seções. */
  const pedirConfirmacao = (titulo: string, mensagem: string, acao: () => void) => {
    setConfirmTitle(titulo);
    setConfirmMessage(mensagem);
    setConfirmCallback(() => acao);
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-10 print:space-y-8">
      <FormacaoCard
        educations={educations}
        isEditMode={isEditMode}
        onUpdateEducations={onUpdateEducations}
        language={language}
        pedirConfirmacao={pedirConfirmacao}
      />

      <ExperienciasCard
        experiences={experiences}
        projects={projects}
        isEditMode={isEditMode}
        onUpdateExperiences={onUpdateExperiences}
        language={language}
        pedirConfirmacao={pedirConfirmacao}
      />

      <AtividadesCard
        academicActivities={academicActivities}
        projects={projects}
        isEditMode={isEditMode}
        onUpdateAcademicActivities={onUpdateAcademicActivities}
        language={language}
        pedirConfirmacao={pedirConfirmacao}
      />

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (confirmCallback) confirmCallback();
          setConfirmOpen(false);
        }}
        title={confirmTitle}
        message={confirmMessage}
      />
    </div>
  );
}
