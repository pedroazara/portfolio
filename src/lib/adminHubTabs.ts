/**
 * As abas do painel, num módulo à parte.
 *
 * O App precisa da lista para ler a rota (`/admin/painel/tarefas`), mas a
 * página do painel é carregada sob demanda — importar a constante de dentro
 * dela traria junto quadro de tarefas, hábitos, links e rascunhos para
 * o pacote inicial, desfazendo a separação.
 */
export type AdminHubTab =
  | "meu-espaco"
  | "visao-geral"
  | "projetos"
  | "tarefas"
  | "links"
  | "rascunhos"
  | "atividade";

export const ADMIN_HUB_TABS: AdminHubTab[] = [
  "meu-espaco",
  "visao-geral",
  "projetos",
  "tarefas",
  "links",
  "rascunhos",
  "atividade",
];

/**
 * Endereços antigos que continuam funcionando: "Atualizações" virou "Meu
 * espaço", e os hábitos passaram a morar dentro dele.
 */
export const LEGACY_ADMIN_HUB_TABS: Record<string, { tab: AdminHubTab; area?: string }> = {
  atualizacoes: { tab: "meu-espaco" },
  habitos: { tab: "meu-espaco", area: "habitos" },
};
