-- =====================================================================
-- Idiomas do painel: o baralho de flashcards (revisão espaçada) e os dias
-- de estudo, começando pelo alemão.
--
-- Como usar: painel do Supabase > SQL Editor > New query > cole tudo
-- isto > Run. É seguro rodar mais de uma vez.
--
-- `admin_language_cards`: um cartão por palavra ou frase. A chave única
-- (lang, front) impede que o agente da manhã repita um cartão que já está
-- no baralho. `due_on`, `interval_days`, `ease`, `reps` e `lapses` guardam a
-- agenda de revisão (src/lib/languageCards.ts).
--
-- `admin_language_days`: um registro por idioma e dia, com quantos cartões
-- você revisou e se fez o Duolingo. É daí que sai a sequência de dias.
--
-- Mesmo modelo de segurança das outras ferramentas pessoais: nada para
-- `anon`, tudo para `authenticated`.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.admin_language_cards (
  id               uuid primary key default gen_random_uuid(),
  lang             text not null default 'de' check (lang ~ '^[a-z]{2,3}$'),
  front            text not null check (length(trim(front)) > 0),
  back             text not null default '',
  example          text,
  notes            text,
  source           text,
  due_on           date not null default current_date,
  interval_days    integer not null default 0,
  ease             real not null default 2.5,
  reps             integer not null default 0,
  lapses           integer not null default 0,
  last_reviewed_at timestamptz,
  created_at       timestamptz not null default now(),
  unique (lang, front)
);

create index if not exists admin_language_cards_due_idx
  on public.admin_language_cards (lang, due_on);

create table if not exists public.admin_language_days (
  lang       text not null check (lang ~ '^[a-z]{2,3}$'),
  day        date not null,
  reviewed   integer not null default 0,
  duolingo   boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (lang, day)
);

alter table public.admin_language_cards enable row level security;
alter table public.admin_language_days enable row level security;
revoke all on public.admin_language_cards from anon;
revoke all on public.admin_language_days from anon;
grant select, insert, update, delete on public.admin_language_cards to authenticated;
grant select, insert, update, delete on public.admin_language_days to authenticated;

drop policy if exists "admin_language_cards_authenticated_all" on public.admin_language_cards;
create policy "admin_language_cards_authenticated_all"
  on public.admin_language_cards for all to authenticated
  using (true) with check (true);

drop policy if exists "admin_language_days_authenticated_all" on public.admin_language_days;
create policy "admin_language_days_authenticated_all"
  on public.admin_language_days for all to authenticated
  using (true) with check (true);
