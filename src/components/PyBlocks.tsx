import React, { useState } from "react";
import { Highlight } from "prism-react-renderer";
import { Copy, Check, Terminal } from "lucide-react";
import LocalImage from "./LocalImage";
import { codeTheme } from "../lib/codeTheme";

/**
 * Código Python com moldura de terminal (as três bolinhas), no tema do site.
 * Puramente estático — a execução acontece no editor (o botão de rodar fica
 * sobre o próprio texto-fonte que se digita, não aqui) e o resultado vira o
 * bloco `PyOutputBlock` logo abaixo, gravado no próprio Markdown. Quem lê
 * nunca baixa um runtime Python nem espera nada rodar.
 */
export function PyCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="group/code relative mt-5 mb-2 rounded-xl overflow-hidden shadow-md border border-slate-700 bg-slate-900">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 text-[10px] font-mono text-slate-400 select-none">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <button
          onClick={handleCopy}
          type="button"
          aria-label={copied ? "Copiado" : "Copiar código"}
          title={copied ? "Copiado" : "Copiar código"}
          className="flex items-center rounded-md p-1.5 bg-slate-700 text-slate-100 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <Highlight code={code} language="python" theme={codeTheme}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed max-h-[450px]`}
            style={{ ...style, background: "transparent" }}
          >
            {tokens.map((line, i) => {
              const { key: lineKey, ...lineProps } = getLineProps({ line });
              return (
                <div key={i} {...lineProps}>
                  {line.map((token, tokenIdx) => {
                    // O tema Dracula deixa keywords (`import`, `print`…) em
                    // itálico por padrão; aqui achatamos isso — itálico em
                    // monoespaçada só atrapalha a leitura do código.
                    const { key: tokenKey, style: tokenStyle, ...tokenProps } = getTokenProps({ token });
                    return <span key={tokenIdx} {...tokenProps} style={{ ...tokenStyle, fontStyle: "normal" }} />;
                  })}
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

interface PyResultPayload {
  stdout?: string;
  stderr?: string;
  error?: string | null;
  images?: string[];
}

/**
 * Saída já pronta de um bloco Python, gerada no editor.
 *
 * Cartão próprio — cantos arredondados como o do código, não colado nele —
 * com cabeçalho identificando o que é ("Saída"), do mesmo jeito que o
 * cabeçalho do código se identifica como `python3`.
 */
export function PyOutputBlock({ raw }: { raw: string }) {
  let data: PyResultPayload | null = null;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data) return null;

  const hasContent = Boolean(data.stdout || data.stderr || data.error || data.images?.length);

  return (
    <div className="mb-5 rounded-xl overflow-hidden shadow-md border border-slate-700 bg-slate-900">
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-700 text-[10px] font-mono uppercase tracking-wider text-slate-400 select-none">
        <Terminal className="h-3 w-3" />
        Saída
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {!hasContent && <p className="text-xs font-mono italic text-slate-500">(sem saída)</p>}
        {data.stdout && (
          <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words leading-relaxed text-emerald-400">
            {data.stdout}
          </pre>
        )}
        {data.stderr && (
          <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words leading-relaxed text-amber-400">
            {data.stderr}
          </pre>
        )}
        {data.error && (
          <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words leading-relaxed text-red-400">
            {data.error}
          </pre>
        )}
        {data.images?.map((src, idx) => (
          <div key={idx} className="overflow-hidden rounded-lg border border-slate-700 bg-white inline-block max-w-full">
            <LocalImage src={src} alt={`Gráfico gerado ${idx + 1}`} className="max-w-full h-auto block" />
          </div>
        ))}
      </div>
    </div>
  );
}
