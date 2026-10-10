-- =====================================================================
-- Registro de edições do portfólio: quem mudou o quê, e quando.
--
-- Como usar: painel do Supabase > SQL Editor > New query > cole tudo
-- isto > Run. É seguro rodar mais de uma vez. Não altera o conteúdo.
--
-- Um gatilho anota cada gravação na tabela `portfolio`, venha de onde
-- vier, com a lista de itens alterados (projeto, post, perfil...) e os
-- campos de cada um. A autoria sai da própria requisição:
--
--   agente   os servidores MCP (mcp/) mandam o cabeçalho
--            `x-portfolio-edit` com o nome do agente, a sessão, a
--            ferramenta usada e uma nota opcional;
--   painel   gravação de uma sessão autenticada sem esse cabeçalho —
--            você editando pelo site;
--   sistema  o resto: scripts com a chave de serviço, SQL Editor.
--
-- O salvamento automático do painel grava a cada pausa na digitação. Para
-- o registro não virar uma linha por pausa, gravações seguidas do painel
-- nos mesmos itens, com menos de 15 minutos entre elas, viram uma linha só.
--
-- Leitura só para `authenticated`; ninguém escreve direto na tabela além
-- do gatilho e dos agentes (que anotam operações só de arquivos, como
-- enviar ou apagar uma imagem sem mexer no conteúdo).
-- =====================================================================

begin;

create table if not exists public.portfolio_edit_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  source      text not null check (source in ('painel', 'agente', 'sistema')),
  agent       text,
  session     text,
  tool        text,
  note        text,
  actor       uuid,
  changes     jsonb not null default '[]'::jsonb check (jsonb_typeof(changes) = 'array'),
  saves       int not null default 1
);

create index if not exists portfolio_edit_log_created_at_idx
  on public.portfolio_edit_log (created_at desc);

alter table public.portfolio_edit_log enable row level security;
revoke all on public.portfolio_edit_log from anon, authenticated;
grant select, insert on public.portfolio_edit_log to authenticated;

drop policy if exists "portfolio_edit_log_read" on public.portfolio_edit_log;
create policy "portfolio_edit_log_read"
  on public.portfolio_edit_log for select to authenticated using (true);

drop policy if exists "portfolio_edit_log_agent_insert" on public.portfolio_edit_log;
create policy "portfolio_edit_log_agent_insert"
  on public.portfolio_edit_log for insert to authenticated
  with check (source = 'agente');


-- ---------------------------------------------------------------------
-- O que mudou entre duas versões do documento: uma entrada por item.
-- { collection, id, slug, label, action: criado|alterado|removido|reordenado, fields }
-- ---------------------------------------------------------------------
create or replace function public.portfolio_document_changes(old_doc jsonb, new_doc jsonb)
returns jsonb
language plpgsql immutable set search_path = public, pg_temp as $$
declare
  sections text[] := array['projects','posts','experiences','academicActivities','educations','skills','skillCategories','courses','categories'];
  section text;
  items jsonb;
  result jsonb := '[]'::jsonb;
begin
  foreach section in array sections loop
    if old_doc->section is not distinct from new_doc->section then continue; end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'collection', section,
      'id', coalesce(n.value->>'id', o.value->>'id'),
      'slug', coalesce(n.value->>'codigo', o.value->>'codigo'),
      'label', coalesce(
        n.value->>'title', n.value->>'name', n.value->>'company', n.value->>'institution',
        o.value->>'title', o.value->>'name', o.value->>'company', o.value->>'institution',
        n.value->>'id', o.value->>'id'),
      'action', case when o.value is null then 'criado' when n.value is null then 'removido' else 'alterado' end,
      'fields', case when o.value is null or n.value is null then '[]'::jsonb else (
        select coalesce(jsonb_agg(k order by k), '[]'::jsonb)
        from (select jsonb_object_keys(o.value) k union select jsonb_object_keys(n.value)) keys
        where o.value->k is distinct from n.value->k) end
    )), '[]'::jsonb)
    into items
    from jsonb_array_elements(coalesce(old_doc->section, '[]'::jsonb)) o
    full join jsonb_array_elements(coalesce(new_doc->section, '[]'::jsonb)) n
      on o.value->>'id' = n.value->>'id'
    where o.value is distinct from n.value;

    -- Mesmos itens, outra ordem: arrastar cartões no painel.
    if items = '[]'::jsonb then
      items := jsonb_build_array(jsonb_build_object('collection', section, 'action', 'reordenado', 'fields', '[]'::jsonb));
    end if;
    result := result || items;
  end loop;

  if old_doc->'profile' is distinct from new_doc->'profile' then
    result := result || jsonb_build_array(jsonb_build_object(
      'collection', 'profile', 'id', 'profile', 'label', 'Perfil', 'action', 'alterado',
      'fields', (
        select coalesce(jsonb_agg(k order by k), '[]'::jsonb)
        from (select jsonb_object_keys(coalesce(old_doc->'profile', '{}')) k
              union select jsonb_object_keys(coalesce(new_doc->'profile', '{}'))) keys
        where old_doc->'profile'->k is distinct from new_doc->'profile'->k)));
  end if;

  -- Qualquer outra chave do topo (seções que surgirem no futuro).
  select result || coalesce(jsonb_agg(jsonb_build_object('collection', k, 'action', 'alterado', 'fields', '[]'::jsonb) order by k), '[]'::jsonb)
  into result
  from (select jsonb_object_keys(coalesce(old_doc, '{}')) k union select jsonb_object_keys(coalesce(new_doc, '{}'))) keys
  where k <> 'profile' and k <> all(sections) and old_doc->k is distinct from new_doc->k;

  return result;
end $$;


-- ---------------------------------------------------------------------
-- Gatilho: anota a gravação, juntando as do painel feitas em sequência.
-- ---------------------------------------------------------------------
create or replace function public.log_portfolio_edit()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  meta jsonb;
  v_source text;
  v_actor uuid;
  v_changes jsonb;
  v_targets jsonb;
  last_entry public.portfolio_edit_log;
begin
  if old.data is not distinct from new.data then return new; end if;

  -- O registro é acessório: um erro aqui nunca pode impedir a gravação.
  begin
    begin
      meta := convert_from(decode(
        nullif(current_setting('request.headers', true), '')::jsonb->>'x-portfolio-edit', 'base64'), 'UTF8')::jsonb;
    exception when others then
      meta := null;
    end;

    v_actor := auth.uid();
    v_source := case when meta is not null then 'agente' when v_actor is not null then 'painel' else 'sistema' end;
    v_changes := public.portfolio_document_changes(old.data, new.data);
    if jsonb_typeof(meta->'files') = 'array' then
      v_changes := v_changes || (meta->'files');
    end if;

    if v_source = 'painel' then
      select * into last_entry from public.portfolio_edit_log order by id desc limit 1;
      v_targets := (select jsonb_agg(distinct t order by t) from (
        select (e->>'collection') || ':' || coalesce(e->>'id', '') t from jsonb_array_elements(v_changes) e) x);

      if last_entry.id is not null
         and last_entry.source = 'painel'
         and last_entry.actor is not distinct from v_actor
         and last_entry.updated_at > clock_timestamp() - interval '15 minutes'
         and v_targets = (select jsonb_agg(distinct t order by t) from (
           select (e->>'collection') || ':' || coalesce(e->>'id', '') t from jsonb_array_elements(last_entry.changes) e) x)
      then
        -- Mesma sessão de edição: soma os campos e conta mais uma gravação.
        update public.portfolio_edit_log l set
          updated_at = clock_timestamp(),
          saves = l.saves + 1,
          changes = coalesce((
            select jsonb_agg(n.value || jsonb_build_object(
              'action', case when o.value->>'action' = 'criado' then 'criado' else n.value->>'action' end,
              'fields', (
                select coalesce(jsonb_agg(f order by f), '[]'::jsonb)
                from (select jsonb_array_elements_text(coalesce(n.value->'fields', '[]')) f
                      union select jsonb_array_elements_text(coalesce(o.value->'fields', '[]'))) u)))
            from jsonb_array_elements(v_changes) n
            left join jsonb_array_elements(last_entry.changes) o
              on o.value->>'collection' = n.value->>'collection'
             and coalesce(o.value->>'id', '') = coalesce(n.value->>'id', '')), l.changes)
        where l.id = last_entry.id;
        return new;
      end if;
    end if;

    insert into public.portfolio_edit_log (source, agent, session, tool, note, actor, changes)
    values (v_source, left(meta->>'agent', 200), left(meta->>'session', 100), left(meta->>'tool', 100),
            left(meta->>'note', 500), v_actor, v_changes);

    -- Retenção: as 2000 entradas mais recentes.
    delete from public.portfolio_edit_log
    where id < (select id from public.portfolio_edit_log order by id desc offset 1999 limit 1);
  exception when others then
    raise warning 'portfolio_edit_log: %', sqlerrm;
  end;
  return new;
end $$;

revoke all on function public.log_portfolio_edit() from public;
drop trigger if exists portfolio_edit_log on public.portfolio;
create trigger portfolio_edit_log
  after update on public.portfolio
  for each row execute function public.log_portfolio_edit();

notify pgrst, 'reload schema';

commit;
