import { Component, ReactNode } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { useLanguage, useLocalePath } from "../lib/routes";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Rede de segurança para toda a árvore da aplicação.
 *
 * Sem isto, um erro de render em qualquer componente (um Markdown malformado,
 * uma falha no gerador de PDF) derrubava a página inteira para uma tela
 * branca — quem visse pensaria que o site inteiro caiu, não que um componente
 * específico quebrou. `getDerivedStateFromError`/`componentDidCatch` só
 * funcionam em componentes de classe; o texto bilíngue mora em `Fallback`
 * (função) por baixo, onde os hooks de idioma/rota continuam disponíveis.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary capturou um erro:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <Fallback />;
    }
    return this.props.children;
  }
}

function Fallback() {
  const language = useLanguage();
  const home = useLocalePath()("/");
  const isEn = language === "en";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold font-display text-slate-900 dark:text-white">
            {isEn ? "Something went wrong" : "Algo deu errado"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isEn
              ? "This part of the page failed to load. Reloading usually fixes it."
              : "Esta parte da página falhou ao carregar. Recarregar geralmente resolve."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700 cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" />
            {isEn ? "Reload" : "Recarregar"}
          </button>
          <a
            href={home}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Home className="h-3.5 w-3.5" />
            {isEn ? "Back to home" : "Voltar ao início"}
          </a>
        </div>
      </div>
    </div>
  );
}
