import { motion } from "motion/react";
import PitchSiteQr from "./PitchSiteQr";
import { Language } from "../lib/translations";

/** Curta o bastante para virar um selo em vez de uma frase inteira. */
const LIMITE_SELO = 42;

interface PitchMotivacaoSlideProps {
  /** Uma seção de tela cheia por linha — hoje os selos/frases do preparo. */
  linhas: string[];
  siteUrl: string;
  language?: Language;
}

/**
 * Último slide do elevator pitch: cada linha vira uma tela cheia que desliza
 * para dentro conforme a rolagem, e só ao chegar ao fim aparece o QR code do
 * site — o gesto de fechamento da apresentação.
 *
 * Hoje as linhas são só os selos/frases já cadastrados no preparo (texto
 * placeholder); quando a história de infância/motivação ganhar conteúdo
 * próprio, cada trecho dela vira uma dessas seções, sem mudar o mecanismo de
 * rolagem em si.
 */
export default function PitchMotivacaoSlide({ linhas, siteUrl, language = "pt" }: PitchMotivacaoSlideProps) {
  return (
    <div className="h-full snap-y snap-mandatory overflow-y-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {linhas.map((linha, i) => (
        <motion.div
          key={i}
          className="flex h-full snap-center items-center justify-center px-2"
          initial={{ opacity: 0, y: 56 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.6, once: false }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {linha.length <= LIMITE_SELO ? (
            <span className="rounded-full bg-white/95 px-6 py-3 text-lg font-bold text-slate-800 shadow-lg sm:text-2xl dark:bg-slate-900/95 dark:text-slate-100">
              {linha}
            </span>
          ) : (
            <p className="w-full max-w-3xl rounded-2xl bg-white/95 px-6 py-4 text-center text-base leading-relaxed text-slate-800 shadow-lg sm:text-lg dark:bg-slate-900/95 dark:text-slate-100">
              {linha}
            </p>
          )}
        </motion.div>
      ))}

      <motion.div
        className="flex h-full snap-center items-center justify-center px-2"
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ amount: 0.6, once: false }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <PitchSiteQr url={siteUrl} language={language} />
      </motion.div>
    </div>
  );
}
