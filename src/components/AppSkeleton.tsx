import React from "react";

/** Bloco cinza pulsante — a unidade básica de todo esqueleto abaixo. */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-superficie-alta ${className}`} />;
}

/**
 * Tela de carregamento inicial, no formato do que vai aparecer.
 *
 * Substitui o antigo "Carregando site" — um ícone pulsando sozinho num fundo
 * vazio, sem relação com a página que vem a seguir. É a tela que qualquer
 * visita ao site mostra por um instante, enquanto os dados ainda vêm da
 * nuvem: vale a pena que o instante pareça o começo da página, não uma
 * interrupção antes dela.
 *
 * O cabeçalho aqui é decoração fixa (mesma altura, 64px, mesmas três zonas do
 * `GlobalHeader` real) — não pisca nem troca de estado; só os blocos de
 * conteúdo pulsam. Quando os dados chegam, este componente sai da árvore e o
 * layout real ocupa exatamente o espaço que já estava reservado.
 */
export default function AppSkeleton() {
  return (
    <div className="min-h-screen bg-papel transition-colors duration-300">
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      <header
        className="w-full border-b border-borda bg-superficie"
        style={{ height: 64 }}
        aria-hidden="true"
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="h-11 w-11 animate-pulse rounded-full bg-superficie-alta" />
            <Bar className="hidden h-4 w-24 sm:block" />
          </div>

          <div className="hidden items-center gap-2 min-[860px]:flex">
            <Bar className="h-8 w-16 rounded-lg" />
            <Bar className="h-8 w-20 rounded-lg" />
            <Bar className="h-8 w-16 rounded-lg" />
            <Bar className="h-8 w-24 rounded-lg" />
          </div>

          <div className="flex items-center gap-2">
            <Bar className="hidden h-8 w-16 rounded-lg min-[860px]:block" />
            <Bar className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      </header>

      <main
        aria-hidden="true"
        className="mx-auto max-w-[1600px] space-y-10 px-4 py-8 sm:px-8 lg:px-12"
      >
        {/* Ficha de apresentação */}
        <div className="relative overflow-hidden rounded-3xl border border-borda-suave bg-superficie p-6 shadow-sm sm:p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-12">
            <div className="mx-auto h-36 w-36 shrink-0 animate-pulse rounded-[1.75rem] bg-superficie-alta sm:h-44 sm:w-44" />
            <div className="space-y-4">
              <Bar className="h-8 w-64 max-w-full" />
              <Bar className="h-4 w-48 max-w-full" />
              <div className="flex flex-wrap gap-3">
                <Bar className="h-9 w-32 rounded-xl" />
                <Bar className="h-9 w-32 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Projetos em destaque */}
        <div className="space-y-4">
          <Bar className="h-5 w-40" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-borda-suave bg-superficie shadow-sm"
              >
                <div className="aspect-video w-full animate-pulse bg-superficie-alta" />
                <div className="space-y-2 p-4">
                  <Bar className="h-4 w-3/4" />
                  <Bar className="h-3 w-full" />
                  <Bar className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
