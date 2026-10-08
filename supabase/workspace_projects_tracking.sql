-- Integra os acompanhamentos privados aos projetos públicos sem publicar dados.
-- Execute após workspace_projects.sql. É seguro executar novamente.
-- Um projeto do portfólio pode ter somente um acompanhamento privado.
begin;

alter table public.admin_workspace_projects
  add column if not exists portfolio_project_id text
    constraint workspace_projects_portfolio_id_valid
    check (portfolio_project_id is null or
      (length(btrim(portfolio_project_id)) between 1 and 200)),
  add column if not exists checklist_items jsonb not null default '[]'::jsonb
    constraint workspace_projects_checklist_items_array
    check (jsonb_typeof(checklist_items) = 'array' and jsonb_array_length(checklist_items) <= 500),
  add column if not exists milestones jsonb not null default '[]'::jsonb
    constraint workspace_projects_milestones_array
    check (jsonb_typeof(milestones) = 'array' and jsonb_array_length(milestones) <= 100),
  add column if not exists updates jsonb not null default '[]'::jsonb
    constraint workspace_projects_updates_array
    check (jsonb_typeof(updates) = 'array' and jsonb_array_length(updates) <= 500);

create unique index if not exists admin_workspace_projects_portfolio_project_unique_idx
  on public.admin_workspace_projects (portfolio_project_id)
  where portfolio_project_id is not null;

notify pgrst, 'reload schema';
commit;
