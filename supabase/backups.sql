-- =====================================================================
-- Backups automáticos do portfólio.
--
-- Como usar: painel do Supabase > SQL Editor > New query > cole tudo
-- isto > Run. É seguro rodar mais de uma vez.
--
-- O que isto cria:
--   1. Uma tabela de histórico (`portfolio_backups`) com snapshots do
--      documento do portfólio.
--   2. Uma função que tira um snapshot novo só quando o conteúdo mudou
--      desde o último (evita acumular cópias idênticas) e descarta
--      snapshots além dos 30 mais recentes.
--   3. Um agendamento diário via pg_cron que chama essa função sozinho,
--      sem depender de o admin estar editando o site.
--
-- Requer a extensão pg_cron. Se o `create extension` abaixo falhar por
-- permissão, habilite manualmente em Database > Extensions > pg_cron no
-- painel do Supabase e rode este arquivo de novo.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Tabela de histórico de backups
--
-- Cada linha é uma cópia inteira do documento do portfólio num instante
-- passado — o mesmo formato jsonb usado em `portfolio.data`. Não tem
-- leitura pública: só o admin autenticado enxerga e restaura backups.
-- ---------------------------------------------------------------------
create table if not exists public.portfolio_backups (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  source      text not null default 'scheduled' check (source in ('scheduled', 'manual')),
  data        jsonb not null
);

create index if not exists portfolio_backups_created_at_idx
  on public.portfolio_backups (created_at desc);

alter table public.portfolio_backups enable row level security;

drop policy if exists "portfolio_backups_authenticated_read" on public.portfolio_backups;
create policy "portfolio_backups_authenticated_read"
  on public.portfolio_backups
  for select
  to authenticated
  using (true);

drop policy if exists "portfolio_backups_authenticated_insert" on public.portfolio_backups;
create policy "portfolio_backups_authenticated_insert"
  on public.portfolio_backups
  for insert
  to authenticated
  with check (true);

drop policy if exists "portfolio_backups_authenticated_delete" on public.portfolio_backups;
create policy "portfolio_backups_authenticated_delete"
  on public.portfolio_backups
  for delete
  to authenticated
  using (true);


-- ---------------------------------------------------------------------
-- 2. Função de snapshot
--
-- `security definer` para que o job do pg_cron (que roda com privilégio
-- de sistema) e o botão "Criar backup agora" do admin (que roda com o
-- papel `authenticated`) usem exatamente a mesma lógica.
-- ---------------------------------------------------------------------
create or replace function public.create_portfolio_backup(p_source text default 'scheduled')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current jsonb;
  v_latest  jsonb;
begin
  select data into v_current from public.portfolio where id = 'main';

  if v_current is null then
    return; -- ainda não existe conteúdo para guardar.
  end if;

  select data into v_latest
  from public.portfolio_backups
  order by created_at desc
  limit 1;

  if v_latest is not distinct from v_current then
    return; -- nada mudou desde o último backup, evita duplicar.
  end if;

  insert into public.portfolio_backups (source, data) values (p_source, v_current);

  -- Retenção: mantém só os 30 backups mais recentes.
  delete from public.portfolio_backups
  where id in (
    select id from public.portfolio_backups
    order by created_at desc
    offset 30
  );
end;
$$;

grant execute on function public.create_portfolio_backup(text) to authenticated;


-- ---------------------------------------------------------------------
-- 3. Agendamento diário via pg_cron
--
-- Roda todo dia às 03:00 UTC. Reagendar é seguro: o bloco abaixo remove
-- o job antigo antes de recriar, então rodar este arquivo de novo não
-- duplica o agendamento.
-- ---------------------------------------------------------------------
create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'portfolio-daily-backup') then
    perform cron.unschedule('portfolio-daily-backup');
  end if;
end $$;

select cron.schedule(
  'portfolio-daily-backup',
  '0 3 * * *',
  $$ select public.create_portfolio_backup('scheduled'); $$
);


-- ---------------------------------------------------------------------
-- 4. Bucket de backups completos (dados + imagens)
--
-- Guarda os arquivos .zip gerados pelo painel (conteúdo + todas as
-- imagens do bucket `images`). Diferente do bucket de imagens, este é
-- privado: só o admin autenticado lista, baixa, cria ou apaga backups.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('full-backups', 'full-backups', false)
on conflict (id) do update set public = false;

drop policy if exists "full_backups_authenticated_read" on storage.objects;
create policy "full_backups_authenticated_read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'full-backups');

drop policy if exists "full_backups_authenticated_insert" on storage.objects;
create policy "full_backups_authenticated_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'full-backups');

drop policy if exists "full_backups_authenticated_delete" on storage.objects;
create policy "full_backups_authenticated_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'full-backups');
