-- =====================================================================
-- Ferramentas pessoais do administrador: tarefas, hábitos, notas, links
-- e rascunhos.
--
-- Como usar: painel do Supabase > SQL Editor > New query > cole tudo
-- isto > Run. É seguro rodar mais de uma vez.
--
-- Modelo de segurança: ao contrário de `portfolio`, nada aqui é público.
-- Estas tabelas não têm política nenhuma para `anon` — só uma sessão
-- autenticada lê ou escreve. São anotações privadas, não conteúdo do
-- site, e a `anon key` que vai no navegador não deve alcançá-las.
-- =====================================================================

create extension if not exists pgcrypto;


-- ---------------------------------------------------------------------
-- 1. Tarefas (quadro kanban)
--
-- `position` ordena os cartões dentro de cada coluna; `status` é a
-- coluna em si.
-- ---------------------------------------------------------------------
create table if not exists public.admin_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  notes       text,
  status      text not null default 'todo' check (status in ('todo','doing','done')),
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists admin_tasks_status_position_idx
  on public.admin_tasks (status, position);


-- ---------------------------------------------------------------------
-- 2. Hábitos e o registro diário
--
-- Um hábito marcado num dia é uma linha em `admin_habit_logs`. A chave
-- primária composta impede marcar o mesmo dia duas vezes, e desmarcar é
-- simplesmente apagar a linha.
-- ---------------------------------------------------------------------
create table if not exists public.admin_habits (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.admin_habit_logs (
  habit_id    uuid not null references public.admin_habits(id) on delete cascade,
  log_date    date not null,
  primary key (habit_id, log_date)
);


-- ---------------------------------------------------------------------
-- 3. Notas rápidas
-- ---------------------------------------------------------------------
create table if not exists public.admin_notes (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. Cofre de links
-- ---------------------------------------------------------------------
create table if not exists public.admin_links (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  title       text not null,
  notes       text,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 5. Rascunhos (ideias antes de virarem post ou projeto)
-- ---------------------------------------------------------------------
create table if not exists public.admin_drafts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'Sem título',
  content     text not null default '',
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 6. RLS: privado de ponta a ponta
--
-- `enable row level security` sem nenhuma política já bloqueia todo
-- mundo; as políticas abaixo reabrem o acesso só para `authenticated`.
-- Repare que nenhuma menciona `anon` — essa é a diferença em relação à
-- tabela `portfolio`.
-- ---------------------------------------------------------------------
alter table public.admin_tasks      enable row level security;
alter table public.admin_habits     enable row level security;
alter table public.admin_habit_logs enable row level security;
alter table public.admin_notes      enable row level security;
alter table public.admin_links      enable row level security;
alter table public.admin_drafts     enable row level security;

drop policy if exists "admin_tasks_authenticated_all" on public.admin_tasks;
create policy "admin_tasks_authenticated_all"
  on public.admin_tasks for all to authenticated
  using (true) with check (true);

drop policy if exists "admin_habits_authenticated_all" on public.admin_habits;
create policy "admin_habits_authenticated_all"
  on public.admin_habits for all to authenticated
  using (true) with check (true);

drop policy if exists "admin_habit_logs_authenticated_all" on public.admin_habit_logs;
create policy "admin_habit_logs_authenticated_all"
  on public.admin_habit_logs for all to authenticated
  using (true) with check (true);

drop policy if exists "admin_notes_authenticated_all" on public.admin_notes;
create policy "admin_notes_authenticated_all"
  on public.admin_notes for all to authenticated
  using (true) with check (true);

drop policy if exists "admin_links_authenticated_all" on public.admin_links;
create policy "admin_links_authenticated_all"
  on public.admin_links for all to authenticated
  using (true) with check (true);

drop policy if exists "admin_drafts_authenticated_all" on public.admin_drafts;
create policy "admin_drafts_authenticated_all"
  on public.admin_drafts for all to authenticated
  using (true) with check (true);
