/**
 * Modo de teste local, sem login.
 *
 * Serve para exercitar as telas de edição durante o desenvolvimento sem
 * precisar de uma sessão real. Três travas o mantêm inofensivo:
 *
 * 1. `import.meta.env.DEV` — o Vite substitui isso por `false` no build de
 *    produção, então o bloco inteiro é eliminado do bundle publicado.
 * 2. Nunca grava na nuvem. A escrita continua condicionada a uma sessão de
 *    verdade; aqui as alterações ficam apenas no `localStorage` deste navegador.
 * 3. Mesmo que alguém forçasse uma gravação, as políticas RLS do Supabase a
 *    recusariam — não há token para apresentar.
 *
 * Como usar:  http://localhost:3000/projetos?dev
 * Para sair:  http://localhost:3000/projetos?dev=0
 */

const STORAGE_KEY = "portfolio_dev_preview";

/** Lê o parâmetro da URL e memoriza a escolha para as próximas navegações. */
function resolveFromUrl(): boolean | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  if (!params.has("dev")) return null;

  const value = params.get("dev");
  return value !== "0" && value !== "false";
}

/**
 * Indica se o modo de teste está ativo nesta aba.
 * Sempre `false` em produção.
 */
export function isDevPreview(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;

  const fromUrl = resolveFromUrl();
  if (fromUrl !== null) {
    // A escolha vale para a sessão da aba, para sobreviver à navegação entre
    // rotas sem precisar repetir o parâmetro em cada link.
    if (fromUrl) {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    return fromUrl;
  }

  return sessionStorage.getItem(STORAGE_KEY) === "1";
}
