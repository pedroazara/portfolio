import React, { useId, useState } from "react";
import {
  Eye,
  PenLine,
  History,
  KeyRound,
  Image as ImageIcon,
  Languages,
  ShieldAlert,
  LogOut,
  Loader2,
} from "lucide-react";
import { ResumeData } from "../../types";
import { isDevPreview } from "../../lib/devPreview";
import BackupsTab from "./BackupsTab";
import SecurityTab from "./SecurityTab";
import MediaTab from "./MediaTab";
import TranslationTab from "./TranslationTab";
import AdvancedTab from "./AdvancedTab";

/**
 * Aba "Administração" do painel: o que antes ficava na faixa escura no topo do
 * site (modo de edição, estado do salvamento e sair) e no modal de
 * gerenciamento (backups, segurança, mídia, tradução e avançado).
 */

type Tool = "backups" | "security" | "media" | "translation" | "advanced";

const TOOLS: { value: Tool; label: string; icon: typeof History }[] = [
  { value: "backups", label: "Backups", icon: History },
  { value: "security", label: "Segurança", icon: KeyRound },
  { value: "media", label: "Mídia", icon: ImageIcon },
  { value: "translation", label: "Tradução", icon: Languages },
  { value: "advanced", label: "Avançado", icon: ShieldAlert },
];

export interface PortfolioAdminPanelProps {
  resumeData: ResumeData;
  isEditMode: boolean;
  onEditModeChange: (editMode: boolean) => void;
  isSaving: boolean;
  savedRecently: boolean;
  onRestore: (data: ResumeData) => void;
  onResetToTemplate: () => void;
  onClearAll: () => void;
  onOpenImageBank: () => void;
  onOpenPdfPreview: () => void;
  /** Ausente no modo de teste local, que não tem sessão para encerrar. */
  onLogout?: () => void | Promise<void>;
  language?: "pt" | "en";
}

export default function PortfolioAdminPanel({
  resumeData,
  isEditMode,
  onEditModeChange,
  isSaving,
  savedRecently,
  onRestore,
  onResetToTemplate,
  onClearAll,
  onOpenImageBank,
  onOpenPdfPreview,
  onLogout,
  language = "pt",
}: PortfolioAdminPanelProps) {
  const id = useId();
  const [tool, setTool] = useState<Tool>("backups");
  const [loggingOut, setLoggingOut] = useState(false);

  const saveStatus = isSaving
    ? "salvando…"
    : savedRecently
      ? "salvo agora"
      : isDevPreview()
        ? "salvo só neste navegador"
        : "sincronizado";

  function switchTool(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TOOLS.length;
    else if (event.key === "ArrowLeft") next = (index + TOOLS.length - 1) % TOOLS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TOOLS.length - 1;
    else return;
    event.preventDefault();
    setTool(TOOLS[next].value);
    document.getElementById(`${id}-tab-${TOOLS[next].value}`)?.focus();
  }

  const logout = async () => {
    if (!onLogout || loggingOut) return;
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  const modeButton = (active: boolean, activeStyle: string) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
      active ? `${activeStyle} shadow-xs` : "text-tinta-fraca hover:text-tinta"
    }`;

  return (
    <div className="space-y-5">
      <section className="ws-card" aria-labelledby={`${id}-site`}>
        <div className="ws-card-heading">
          <div>
            <span className="ws-eyebrow">PORTFÓLIO</span>
            <h2 id={`${id}-site`}>Modo do site</h2>
          </div>
          <span role="status" className="font-mono text-[11px] text-tinta-fraca">
            {saveStatus}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-[23px] pb-[22px]">
          <p className="max-w-xl text-[13px] leading-relaxed text-tinta-fraca">
            {isEditMode
              ? "Editando: o portfólio mostra os botões para criar, editar e reordenar o conteúdo."
              : "Pré-visualizando: você vê o portfólio como qualquer visitante."}
          </p>
          <div role="group" aria-label="Modo do site" className="inline-flex rounded-xl border border-borda bg-superficie-alta p-1">
            <button type="button" aria-pressed={!isEditMode} onClick={() => onEditModeChange(false)} className={modeButton(!isEditMode, "bg-superficie text-tinta")}>
              <Eye className="h-3.5 w-3.5" /> Pré-visualizar
            </button>
            <button type="button" aria-pressed={isEditMode} onClick={() => onEditModeChange(true)} className={modeButton(isEditMode, "bg-acento-solido text-white")}>
              <PenLine className="h-3.5 w-3.5" /> Editar
            </button>
          </div>
        </div>
      </section>

      <section className="ws-card" aria-labelledby={`${id}-tools`}>
        <div className="ws-card-heading">
          <div>
            <span className="ws-eyebrow">FERRAMENTAS</span>
            <h2 id={`${id}-tools`}>Gerenciamento</h2>
          </div>
        </div>
        <div role="tablist" aria-label="Ferramentas do portfólio" className="flex gap-1 overflow-x-auto border-y border-borda px-[18px] py-1.5">
          {TOOLS.map(({ value, label, icon: Icon }, index) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`${id}-tab-${value}`}
              aria-controls={`${id}-panel-${value}`}
              aria-selected={tool === value}
              tabIndex={tool === value ? 0 : -1}
              onClick={() => setTool(value)}
              onKeyDown={(event) => switchTool(event, index)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${
                tool === value ? "bg-acento-suave text-acento" : "text-tinta-fraca hover:text-tinta"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`${id}-panel-${tool}`}
          aria-labelledby={`${id}-tab-${tool}`}
          tabIndex={0}
          className="px-[23px] py-5"
        >
          {tool === "backups" && <BackupsTab language={language} onRestore={onRestore} resumeData={resumeData} />}
          {tool === "security" && <SecurityTab language={language} />}
          {tool === "media" && (
            <MediaTab language={language} onOpenImageBank={onOpenImageBank} onOpenPdfPreview={onOpenPdfPreview} />
          )}
          {tool === "translation" && (
            <TranslationTab language={language} resumeData={resumeData} onRestore={onRestore} />
          )}
          {tool === "advanced" && (
            <AdvancedTab
              language={language}
              resumeData={resumeData}
              onRestore={onRestore}
              onResetToTemplate={onResetToTemplate}
              onClearAll={onClearAll}
            />
          )}
        </div>
      </section>

      {onLogout && (
        <section className="ws-card" aria-labelledby={`${id}-session`}>
          <div className="ws-card-heading">
            <div>
              <span className="ws-eyebrow">SESSÃO</span>
              <h2 id={`${id}-session`}>Sair da conta</h2>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-xl border border-borda px-4 py-2.5 text-xs font-semibold text-tinta-fraca transition-colors hover:bg-superficie-alta hover:text-tinta"
            >
              {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              Sair
            </button>
          </div>
          <p className="px-[23px] pb-[22px] text-[13px] text-tinta-fraca">
            Encerra a sessão neste navegador. O que estiver aberto no painel é salvo antes.
          </p>
        </section>
      )}
    </div>
  );
}
