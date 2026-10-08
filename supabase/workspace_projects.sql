-- Projetos privados do painel pessoal. Execute no SQL Editor do Supabase.
-- Pode ser executado mais de uma vez. Não modifica os projetos públicos.
-- O acesso segue o mesmo modelo de admin_tools.sql: somente authenticated.
-- Os vínculos guardam IDs; excluir um projeto nunca exclui tarefas ou referências.

begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_workspace_projects (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(btrim(title)) > 0),
  goal         text not null default '',
  due_date     date,
  status       text not null default 'planned'
               check (status in ('planned', 'active', 'paused', 'completed')),
  task_ids     uuid[] not null default '{}',
  note_ids     uuid[] not null default '{}',
  link_ids     uuid[] not null default '{}',
  next_task_id uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint workspace_projects_next_task_linked
    check (next_task_id is null or next_task_id = any(task_ids)),
  constraint workspace_projects_task_ids_not_null
    check (array_position(task_ids, null) is null),
  constraint workspace_projects_note_ids_not_null
    check (array_position(note_ids, null) is null),
  constraint workspace_projects_link_ids_not_null
    check (array_position(link_ids, null) is null)
);

create index if not exists admin_workspace_projects_updated_at_idx
  on public.admin_workspace_projects (updated_at desc, id);

-- Também atualiza instalações que já possuem a tabela original.
-- As informações de acompanhamento continuam nesta tabela privada.
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

alter table public.admin_workspace_projects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_workspace_projects'
      and policyname = 'admin_workspace_projects_authenticated_all'
  ) then
    create policy "admin_workspace_projects_authenticated_all"
      on public.admin_workspace_projects for all to authenticated
      using (true) with check (true);
  end if;
end;
$$;

revoke all on public.admin_workspace_projects from anon;
grant select, insert, update, delete on public.admin_workspace_projects to authenticated;

notify pgrst, 'reload schema';

commit;
