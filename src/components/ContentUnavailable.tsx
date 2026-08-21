import React from "react";
import { CloudOff, Loader2 } from "lucide-react";
import { Language } from "../lib/translations";

/**
 * Tela para quando o conteúdo não aparece — mas não por não existir.
 *
 * Antes, falha de rede e link errado davam na mesma mensagem: "não
 * encontrado". Quem visitava concluía que o trabalho tinha sido apagado, e o
 * dono do site não tinha como distinguir um do outro pelo relato. Aqui o
 * carregamento e a falha têm cada um a sua tela, e a falha oferece o que de
 * fato costuma resolver: tentar de novo.
 */
export default function ContentUnavailable({
  state,
  language = "pt",
}: {
  state: "loading" | "failed";
  language?: Language;
}) {
  const carregando = state === "loading";

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
      {carregando ? (
        <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-indigo-500" />
      ) : (
        <CloudOff className="mx-auto mb-3 h-10 w-10 text-amber-500" />
      )}

      <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">
        {carregando
          ? language === "en" ? "Loading…" : "Carregando…"
          : language === "en" ? "Couldn't load the content" : "Não consegui carregar o conteúdo"}
      </h1>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {carregando
          ? language === "en"
            ? "Fetching the latest version."
            : "Buscando a versão mais recente."
          : language === "en"
            ? "The connection to the server failed. The page is still there — this is on our side."
            : "A conexão com o servidor falhou. A página continua existindo; o problema é aqui."}
      </p>

      {!carregando && (
        <button
          onClick={() => window.location.reload()}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
        >
          {language === "en" ? "Try again" : "Tentar de novo"}
        </button>
      )}
    </div>
  );
}
