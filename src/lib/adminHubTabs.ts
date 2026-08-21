/**
 * As abas do painel, num módulo à parte.
 *
 * O App precisa da lista para ler a rota (`/admin/painel/tarefas`), mas a
 * página do painel é carregada sob demanda — importar a constante de dentro
 * dela traria junto quadro de tarefas, hábitos, notas, links e rascunhos para
 * o pacote inicial, desfazendo a separação.
 */
export type AdminHubTab = "tarefas" | "habitos" | "notas" | "links" | "rascunhos";

export const ADMIN_HUB_TABS: AdminHubTab[] = ["tarefas", "habitos", "notas", "links", "rascunhos"];
