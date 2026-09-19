import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import PitchSiteQr from "./PitchSiteQr";
import { Language } from "../lib/translations";

interface PitchMotivacaoSlideProps {
  /** Tópicos breves para guiar a fala, reunidos antes do QR code. */
  linhas: string[];
  siteUrl: string;
  language?: Language;
}

/** Cada rolagem acrescenta um tópico com fade; depois do último, surge o QR. */
export default function PitchMotivacaoSlide({ linhas, siteUrl, language = "pt" }: PitchMotivacaoSlideProps) {
  const [etapa, setEtapa] = useState(0);
  const reduzirMovimento = useReducedMotion();
  const isEn = language === "en";
  const mostrandoQr = etapa >= linhas.length;
  const duracao = reduzirMovimento ? 0 : 0.55;

  return (
    <div className="relative h-full">
      <div aria-hidden="true" data-motivation-background className="pointer-events-none absolute inset-y-0 right-0 w-[86%] overflow-hidden">
        <img src="/pitch/sirius-aerial.png" alt="" className="h-full w-full object-cover object-center opacity-[0.24] grayscale" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#102536] via-[#102536]/55 to-[#102536]/5" />
      </div>

      <div
        data-testid="pitch-motivation-scroll"
        onScroll={(event) => {
          const { clientHeight, scrollTop } = event.currentTarget;
          if (clientHeight > 0) setEtapa(Math.min(linhas.length, Math.round(scrollTop / clientHeight)));
        }}
        className="absolute inset-0 z-10 snap-y snap-mandatory overflow-y-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Array.from({ length: linhas.length + 1 }, (_, index) => (
          <div key={index} data-motivation-snap={index + 1} className="h-full snap-start" />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-2 py-6 sm:px-8">
        <AnimatePresence mode="sync" initial={false}>
          {mostrandoQr ? (
            <motion.div
              key="qr"
              className="pointer-events-auto col-start-1 row-start-1 flex flex-col items-center gap-5"
              initial={{ opacity: 0, scale: reduzirMovimento ? 1 : 0.94, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: reduzirMovimento ? 1 : 0.97, filter: "blur(6px)" }}
              transition={{ duration: duracao, ease: [0.22, 1, 0.36, 1] }}
            >
              <PitchSiteQr url={siteUrl} language={language} />
              <p className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">{isEn ? "Thank you!" : "Obrigado!"}</p>
            </motion.div>
          ) : (
            <motion.ol
              key="topics"
              layout={!reduzirMovimento}
              className="col-start-1 row-start-1 w-full max-w-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: reduzirMovimento ? 0 : -24, filter: "blur(8px)" }}
              transition={{ duration: duracao, ease: [0.22, 1, 0.36, 1] }}
            >
              <AnimatePresence initial={false}>
                {linhas.slice(0, etapa + 1).map((linha, index) => (
                  <motion.li
                    key={`${index}-${linha}`}
                    layout={!reduzirMovimento}
                    data-motivation-topic={index + 1}
                    className="relative flex items-baseline gap-4 py-5 sm:gap-6 sm:py-7"
                    initial={{ opacity: 0, y: reduzirMovimento ? 0 : 28, filter: "blur(8px)" }}
                    animate={{
                      opacity: index === etapa ? 1 : 0.52,
                      y: 0,
                      filter: "blur(0px)",
                    }}
                    exit={{ opacity: 0, y: reduzirMovimento ? 0 : -12, filter: "blur(5px)" }}
                    transition={{
                      layout: { duration: duracao, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: reduzirMovimento ? 0 : 0.4, ease: "easeOut" },
                      y: { duration: duracao, ease: [0.22, 1, 0.36, 1] },
                      filter: { duration: reduzirMovimento ? 0 : 0.45, ease: "easeOut" },
                    }}
                  >
                    <motion.span
                      aria-hidden="true"
                      animate={{ color: index === etapa ? "#ffffff" : "#94a3b8" }}
                      transition={{ duration: reduzirMovimento ? 0 : 0.4 }}
                      className="shrink-0 font-mono text-xs tabular-nums sm:text-sm"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </motion.span>
                    <span className="font-display text-xl font-medium leading-snug text-white sm:text-3xl">{linha}</span>
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-px origin-left bg-white/20"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: reduzirMovimento ? 0 : 0.65, delay: reduzirMovimento ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ol>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
