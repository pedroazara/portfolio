import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, RefreshCw, Presentation, Download, Loader2 } from "lucide-react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { ResumeData } from "../types";
import { Language } from "../lib/translations";
import { PitchDraft, carregarRascunho, gerarRascunhoPadrao, salvarRascunho } from "../utils/elevatorPitch";
import PitchProjectsSlide from "./PitchProjectsSlide";
import PitchProjectPicker from "./PitchProjectPicker";
import PitchSlideCanvas, { PitchAccent, ACCENT_SOLIDO } from "./PitchSlideCanvas";
import PitchIdentitySlide from "./PitchIdentitySlide";

/** Cada linha do rascunho vira um elemento visual próprio no slide. */
function linhasDoTexto(texto: string): string[] {
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
}

/** Curta o bastante para virar um selo em vez de uma frase inteira. */
const LIMITE_SELO = 42;

interface ElevatorPitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ResumeData;
  /** Qual tela abre primeiro: o preparo, ou já a apresentação. */
  vistaInicial?: "editar" | "apresentar";
  language?: Language;
}

const TOTAL_SLIDES = 4;

/** Uma cor por posição — dá ritmo à sequência de slides. */
const ACCENTS: PitchAccent[] = ["azul", "verde", "dourado", "cnpem"];

/** Direção de entrada/saída do slide: 1 avançando, -1 voltando. */
const SLIDE_VARIANTS = {
  entra: (dir: number) => ({ opacity: 0, x: dir * 36 }),
  centro: { opacity: 1, x: 0 },
  sai: (dir: number) => ({ opacity: 0, x: dir * -36 }),
};

type Chave = "quemSouEu" | "habilidades" | "motivacao";

/** slide 0 → quemSouEu · slide 1 → projetos (sem texto solto) · slide 2 → habilidades · slide 3 → motivação */
function chaveDoSlide(indice: number): Chave | null {
  if (indice === 0) return "quemSouEu";
  if (indice === 2) return "habilidades";
  if (indice === 3) return "motivacao";
  return null;
}

/**
 * Elevator pitch de até 4 slides, para entrevistas como a do Programa
 * Unificado de Estágios do CNPEM: quem sou eu, projetos, habilidades e a
 * relação com o programa.
 *
 * Duas telas: um painel de preparo (título, corpo de texto e curadoria de
 * projetos, tudo editável) e a apresentação em tela cheia. O rascunho nasce
 * preenchido com o que já está no currículo, mas fica só no `localStorage`
 * deste navegador — é material de ensaio para uma entrevista específica, não
 * conteúdo do site.
 */
export default function ElevatorPitchModal({
  isOpen,
  onClose,
  data,
  vistaInicial = "editar",
  language = "pt",
}: ElevatorPitchModalProps) {
  const isEn = language === "en";
  const [vista, setVista] = useState<"editar" | "apresentar">("editar");
  const [indice, setIndice] = useState(0);
  const [direcao, setDirecao] = useState(1);
  const [draft, setDraft] = useState<PitchDraft | null>(null);
  const [exportando, setExportando] = useState(false);

  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setDraft(carregarRascunho(data, language));
      setVista(vistaInicial);
      setIndice(0);
    }
    // Só precisa recarregar quando o modal abre — reagir a `data`/`language`
    // aqui sobrescreveria o que a pessoa está digitando a cada troca de idioma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const irPara = (novoIndice: number) => {
    setDirecao(novoIndice >= indice ? 1 : -1);
    setIndice(Math.max(0, Math.min(novoIndice, TOTAL_SLIDES - 1)));
  };

  // Setas e espaço navegam; Esc (tratado por `useEscapeKey`) é o único jeito
  // de sair — nada de botão sobrando em cima do slide.
  useEffect(() => {
    if (!isOpen || vista !== "apresentar") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        irPara(indice + 1);
      }
      if (e.key === "ArrowLeft") irPara(indice - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, vista, indice]);

  if (!isOpen || !draft) return null;

  const atualizarSlide = (chave: Chave, patch: Partial<{ title: string; body: string }>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const proximo = { ...prev, [chave]: { ...prev[chave], ...patch } };
      salvarRascunho(proximo);
      return proximo;
    });
  };

  const reiniciarSlide = (chave: Chave) => {
    const padrao = gerarRascunhoPadrao(data, language);
    atualizarSlide(chave, padrao[chave]);
  };

  const atualizarSelecaoDeProjetos = (ids: string[]) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const proximo = { ...prev, projetosSelecionados: ids };
      salvarRascunho(proximo);
      return proximo;
    });
  };

  const iniciarApresentacao = () => {
    setIndice(0);
    setDirecao(1);
    setVista("apresentar");
  };

  const exportarPDF = async () => {
    if (!draft || exportando) return;
    setExportando(true);
    try {
      const { gerarElevatorPitchPDF } = await import("../utils/elevatorPitchPdf");
      await gerarElevatorPitchPDF(draft, data, language);
    } catch (err) {
      console.error("Não foi possível exportar o elevator pitch em PDF.", err);
    } finally {
      setExportando(false);
    }
  };

  const chaveAtual = chaveDoSlide(indice);
  const accentAtual = ACCENTS[indice];

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-white no-print dark:bg-slate-950">
      {/* Cabeçalho: só no preparo. Na apresentação não sobra nenhum botão —
          Esc é a única saída, como pedido. */}
      {vista === "editar" && (
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">
            <Presentation className="h-3.5 w-3.5" />
            Elevator Pitch
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportarPDF}
              disabled={exportando}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              {exportando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              PDF
            </button>
            <button
              type="button"
              onClick={iniciarApresentacao}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
            >
              <Presentation className="h-3.5 w-3.5" />
              {isEn ? "Present" : "Apresentar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Barra de progresso: só na apresentação, cor do slide atual — a única
          indicação de posição que sobra, e não é clicável. */}
      {vista === "apresentar" && (
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-900">
          <motion.div
            className={`h-full ${ACCENT_SOLIDO[accentAtual]}`}
            initial={false}
            animate={{ width: `${((indice + 1) / TOTAL_SLIDES) * 100}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      )}

      {vista === "editar" ? (
        // ==================== PAINEL DE PREPARO ====================
        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10">
          <div className="mx-auto max-w-3xl space-y-10">
            {(["quemSouEu", "habilidades", "motivacao"] as Chave[]).map((chave, posicao) => (
              <React.Fragment key={chave}>
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      value={draft[chave].title}
                      onChange={(e) => atualizarSlide(chave, { title: e.target.value })}
                      className="w-full bg-transparent font-display text-xl font-black text-slate-900 focus:outline-hidden dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => reiniciarSlide(chave)}
                      title={isEn ? "Regenerate from résumé data" : "Recompor a partir do currículo"}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                    >
                      <RefreshCw className="h-3 w-3" />
                      {isEn ? "Regenerate" : "Recompor"}
                    </button>
                  </div>
                  <textarea
                    value={draft[chave].body}
                    onChange={(e) => atualizarSlide(chave, { body: e.target.value })}
                    rows={5}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-600">
                    {chave === "quemSouEu"
                      ? isEn
                        ? "The title above is what shows huge on the slide — your name works well there. Short lines below become badges."
                        : "O título acima é o que aparece grande no slide — seu nome funciona bem aí. As linhas abaixo viram selos."
                      : isEn
                        ? "One short line per idea — the slide is a cue to speak from, not a script to read."
                        : "Uma frase curta por linha — o slide é uma deixa para falar, não um texto para ler."}
                  </p>
                </section>

                {/* Slide de projetos entra entre "quem sou eu" e "habilidades" —
                    mesma posição em que aparece na apresentação. */}
                {posicao === 0 && (
                  <section className="space-y-3 border-t border-slate-100 pt-8 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl font-black text-slate-900 dark:text-white">
                        {isEn ? "Projects & achievements" : "Projetos e realizações"}
                      </h3>
                      <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {draft.projetosSelecionados.length} {isEn ? "selected" : "selecionados"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isEn
                        ? "Choose which projects show up as cards in the presentation."
                        : "Escolha quais projetos aparecem como cartões na apresentação."}
                    </p>
                    <PitchProjectPicker
                      projects={data.projects}
                      categories={data.categories}
                      selectedIds={draft.projetosSelecionados}
                      onChange={atualizarSelecaoDeProjetos}
                      language={language}
                    />
                  </section>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        // ==================== APRESENTAÇÃO ====================
        // Só o slide — sem rodapé, sem navegação clicável. Setas/espaço
        // avançam, Esc sai; nada disso é um botão na tela.
        <div className="flex flex-1 overflow-hidden p-4 sm:p-8">
            <div className="relative mx-auto flex w-full max-w-6xl flex-1 overflow-hidden">
              <AnimatePresence mode="wait" custom={direcao} initial={false}>
                <motion.div
                  key={indice}
                  custom={direcao}
                  variants={SLIDE_VARIANTS}
                  initial="entra"
                  animate="centro"
                  exit="sai"
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  {indice === 0 ? (
                    <PitchSlideCanvas title="" accent={accentAtual} numero={indice + 1}>
                      <PitchIdentitySlide
                        nome={draft.quemSouEu.title || data.profile.name}
                        avatarUrl={data.profile.avatarUrl}
                        linhas={linhasDoTexto(draft.quemSouEu.body)}
                      />
                    </PitchSlideCanvas>
                  ) : chaveAtual ? (
                    <PitchSlideCanvas title={draft[chaveAtual].title} accent={accentAtual} numero={indice + 1}>
                      <div className="flex h-full flex-wrap content-center items-center justify-center gap-4 px-2">
                        {linhasDoTexto(draft[chaveAtual].body).map((linha, i) =>
                          linha.length <= LIMITE_SELO ? (
                            <span
                              key={i}
                              className="rounded-full bg-white/95 px-6 py-3 text-lg font-bold text-slate-800 shadow-lg sm:text-2xl dark:bg-slate-900/95 dark:text-slate-100"
                            >
                              {linha}
                            </span>
                          ) : (
                            <p
                              key={i}
                              className="w-full max-w-3xl rounded-2xl bg-white/95 px-6 py-4 text-center text-base leading-relaxed text-slate-800 shadow-lg sm:text-lg dark:bg-slate-900/95 dark:text-slate-100"
                            >
                              {linha}
                            </p>
                          )
                        )}
                      </div>
                    </PitchSlideCanvas>
                  ) : (
                    <PitchSlideCanvas
                      title={isEn ? "Projects & achievements" : "Projetos e realizações"}
                      accent={accentAtual}
                      numero={indice + 1}
                      fill
                    >
                      <div className="h-full overflow-hidden rounded-2xl bg-white/95 p-4 shadow-lg sm:p-6 dark:bg-slate-900/95">
                        <PitchProjectsSlide
                          projects={data.projects}
                          categories={data.categories}
                          selectedIds={draft.projetosSelecionados}
                          language={language}
                        />
                      </div>
                    </PitchSlideCanvas>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
      )}
    </div>
  );
}
