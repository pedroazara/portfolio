-- =====================================================================
-- Atualizações diárias do painel: o que chega para você a cada manhã
-- (a dica de inglês e, depois, outras séries).
--
-- Como usar: painel do Supabase > SQL Editor > New query > cole tudo
-- isto > Run. É seguro rodar mais de uma vez.
--
-- Cada linha é uma atualização de uma série (`kind`) num dia. A chave
-- única (kind, day) faz o agente que publica de manhã substituir a do
-- dia em vez de duplicá-la, se rodar duas vezes.
--
-- Mesmo modelo de segurança das ferramentas pessoais (admin_tools.sql):
-- nada para `anon`, tudo para `authenticated`. Quem publica é um agente
-- pelo servidor MCP `painel` (mcp/painel), com o login do administrador
-- ou a chave de serviço.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.admin_daily_updates (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind ~ '^[a-z][a-z0-9-]{1,39}$'),
  day         date not null,
  title       text not null,
  content     text not null default '',
  source      text,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kind, day)
);

create index if not exists admin_daily_updates_day_idx
  on public.admin_daily_updates (day desc, created_at desc);

alter table public.admin_daily_updates enable row level security;
revoke all on public.admin_daily_updates from anon;
grant select, insert, update, delete on public.admin_daily_updates to authenticated;

drop policy if exists "admin_daily_updates_authenticated_all" on public.admin_daily_updates;
create policy "admin_daily_updates_authenticated_all"
  on public.admin_daily_updates for all to authenticated
  using (true) with check (true);
