import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AcademicActivity, Experience } from "../types";
import { Language } from "../lib/translations";
import { conteudoExperienciaPitch, imagensPesquisaPitch, pesquisasPitch, periodoPitch, resumoPitch } from "../utils/pitchExperienceContent";
import PitchHoverGallery from "./PitchHoverGallery";
import LocalImage from "./LocalImage";

function ResearchImages({ experience, language }: { experience: Experience; language: Language }) {
  const [index, setIndex] = useState(0);
  const images = imagensPesquisaPitch(experience, language);
  const current = images[index % images.length];
  const isEn = language === "en";
  if (!current) return <div className="pitch-research-image flex min-h-40 items-center justify-center border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">{isEn ? "Add photos in the experience gallery" : "Adicione fotos na galeria desta experiência"}</div>;
  return <figure className="flex min-w-0 flex-col">
    <div className="pitch-research-image flex shrink-0 items-center justify-center overflow-hidden bg-white">
      <LocalImage src={current.src} alt={current.alt} loading="eager" className="h-full w-full object-contain" />
    </div>
    {images.length > 1 && <figcaption className="mt-2 flex items-center justify-center gap-3 text-xs tabular-nums text-slate-500">
      <button type="button" aria-label={isEn ? "Previous research image" : "Imagem anterior da pesquisa"} onClick={() => setIndex((index + images.length - 1) % images.length)} className="rounded p-1 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"><ChevronLeft size={16} /></button>
      <span aria-live="polite">{index % images.length + 1} / {images.length}</span>
      <button type="button" aria-label={isEn ? "Next research image" : "Próxima imagem da pesquisa"} onClick={() => setIndex((index + 1) % images.length)} className="rounded p-1 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"><ChevronRight size={16} /></button>
    </figcaption>}
  </figure>;
}

interface PitchExperienceSlideProps {
  experiencias: Experience[];
  atividades: AcademicActivity[];
  language: Language;
}

export default function PitchExperienceSlide({ experiencias, atividades, language }: PitchExperienceSlideProps) {
  const isEn = language === "en";
  const { atividades: ordered, competencias } = conteudoExperienciaPitch(experiencias, atividades, language);
  const researches = pesquisasPitch(experiencias);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const principal = researches.find(item => item.id === selectedId) || researches[0];
  return (
    <div className="pitch-experience flex h-full flex-col overflow-y-auto bg-[#f7f8fa] p-6 text-slate-800 sm:p-8">
      <div className="grid flex-1 grid-cols-1 gap-8 lg:grid-cols-[2.1fr_1fr] lg:gap-8">
        <section className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{isEn ? "Research experience" : "Experiência em pesquisa"}</h3>
            {researches.length > 1 && <div role="group" aria-label={isEn ? "Select research experience" : "Escolher iniciação científica"} className="flex gap-1">
              {researches.map((item, index) => <button key={item.id} type="button" aria-pressed={item.id === principal?.id} aria-label={`${isEn ? "Research" : "Iniciação científica"} ${index + 1}: ${periodoPitch(item, language)}`} onClick={() => setSelectedId(item.id)} className={`rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 ${item.id === principal?.id ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-200"}`}>IC {index + 1}</button>)}
            </div>}
          </div>
          {principal ? (
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-[1.1fr_1fr]">
              <div>
                <p className="text-xs font-medium tabular-nums text-slate-500">{periodoPitch(principal, language)}</p>
                <h4 className="mt-2 font-display text-xl font-bold leading-snug tracking-tight">{(isEn && principal.roleEn) || principal.role}</h4>
                <p className="mt-3 text-base font-medium text-slate-600">{(isEn && principal.companyEn) || principal.company}</p>
                <p className="mt-4 text-base leading-relaxed text-slate-600">{resumoPitch((isEn && principal.descriptionEn) || principal.description)}</p>
              </div>
              <ResearchImages key={principal.id} experience={principal} language={language} />
            </div>
          ) : <p className="mt-5 text-slate-500">{isEn ? "Add your research experience to the résumé." : "Cadastre sua experiência em pesquisa no currículo."}</p>}
        </section>
        <section className="min-w-0 border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{isEn ? "Extracurricular experience" : "Experiências extracurriculares"}</h3>
          <div className="mt-5 space-y-5">
            {ordered.map(a => {
              const name = (isEn && a.nameEn) || a.name;
              const [short] = name.split(/\s[—–-]\s/);
              return <PitchHoverGallery key={a.id} images={a.galleryImages || []}>
                <article>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h4 title={name} className="font-display text-xl font-bold tracking-tight">{short}</h4>
                    <p className="text-xs tabular-nums text-slate-500">{periodoPitch(a, language)}</p>
                  </div>
                  <p className="mt-2 text-base leading-relaxed text-slate-600">{resumoPitch((isEn && a.descriptionEn) || a.description, 110)}</p>
                </article>
              </PitchHoverGallery>;
            })}
            {ordered.length === 0 && <p className="text-slate-500">{isEn ? "Add activities to the résumé." : "Cadastre suas atividades no currículo."}</p>}
          </div>
        </section>
      </div>
      {competencias.length > 0 && <section className="mt-2 shrink-0 border-t border-slate-200 pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{isEn ? "Technical skills" : "Competências técnicas"}</h3>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm font-medium leading-relaxed text-[#276879] sm:grid-cols-3 lg:grid-cols-5">
          {competencias.map(s => <li key={s}>{s}</li>)}
        </ul>
      </section>}
    </div>
  );
}
