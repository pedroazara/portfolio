import React from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Download, PenLine } from "lucide-react";
import { Profile } from "../types";
import { Language } from "../lib/translations";
import { localePath } from "../lib/routes";
import LocalImage from "./LocalImage";

interface CurriculoResumoProps {
  profile: Profile;
  isEditMode: boolean;
  onOpenPdfPreview: () => void;
  language?: Language;
}

/**
 * A tira de identidade no topo do currículo — quem é, não "olha só".
 *
 * A apresentação grande, com a chamada para ver os projetos e os números do
 * trabalho, já aconteceu na home: é `ResumeHeader`. Repeti-la aqui duplicaria
 * a mesma venda para quem já decidiu ler o currículo inteiro. Esta tira só
 * confirma de quem é a página — necessária porque `/curriculo` recebe visita
 * direta (busca, link salvo) sem passar pela home — e deixa a página entrar
 * direto nas seções.
 *
 * A edição do perfil continua um caminho só, na home: duplicar o modal aqui
 * duplicaria o estado que o guarda. Em modo de edição, o link abaixo leva até
 * lá.
 */
export default function CurriculoResumo({
  profile,
  isEditMode,
  onOpenPdfPreview,
  language = "pt",
}: CurriculoResumoProps) {
  const isEn = language === "en";
  const titulo = (isEn && profile.titleEn) || profile.title;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-borda-suave bg-superficie p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5 print:border-0 print:p-0 print:shadow-none">
      <div className="flex items-center gap-3.5">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-superficie-alta">
          {profile.avatarUrl ? (
            <LocalImage
              src={profile.avatarUrl}
              alt={profile.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-acento">
              {profile.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0">
          {/* Sem truncar: "Pedro Henrique Ázara de Al…" cortando o sobrenome
              falha bem o único trabalho desta tira, que é dizer de quem é a
              página. Duas linhas custam pouco. */}
          <h1 className="font-display text-lg font-black leading-tight tracking-tight text-tinta">{profile.name}</h1>
          {titulo && <p className="text-sm font-semibold text-acento">{titulo}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-tinta-fraca">
        {profile.email && (
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{profile.email}</span>
          </span>
        )}
        {profile.location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {profile.location}
          </span>
        )}

        <div className="flex items-center gap-2 no-print print:hidden">
          {isEditMode && (
            <Link
              to={localePath("/", language)}
              className="flex items-center gap-1.5 rounded-lg border border-borda px-3 py-1.5 text-xs font-semibold text-tinta-suave transition-colors hover:bg-superficie-alta hover:text-tinta"
            >
              <PenLine className="h-3.5 w-3.5" />
              {isEn ? "Edit profile" : "Editar perfil"}
            </Link>
          )}
          <button
            type="button"
            onClick={onOpenPdfPreview}
            className="flex items-center gap-1.5 rounded-lg bg-acento px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-acento-forte"
          >
            <Download className="h-3.5 w-3.5" />
            {isEn ? "PDF" : "PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
