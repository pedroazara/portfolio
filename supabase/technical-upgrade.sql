-- Run once in the Supabase SQL editor. Does not modify existing content.
begin;
create table if not exists public.portfolio_revisions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default clock_timestamp(),
  actor uuid,
  old_data jsonb not null,
  changed_fields text[] not null
);
alter table public.portfolio_revisions enable row level security;
revoke all on public.portfolio_revisions from anon, authenticated;
grant select on public.portfolio_revisions to authenticated;
drop policy if exists revisions_read on public.portfolio_revisions;
create policy revisions_read on public.portfolio_revisions for select to authenticated using (true);

create or replace function public.validate_portfolio_document() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare section text; entry jsonb; field text;
begin
  if jsonb_typeof(new.data) is distinct from 'object' or jsonb_typeof(new.data->'profile') is distinct from 'object' then
    raise exception 'Invalid portfolio document';
  end if;
  foreach field in array array['name','title','bio','email'] loop
    if jsonb_typeof(new.data->'profile'->field) is distinct from 'string' then raise exception 'Invalid profile field: %', field; end if;
  end loop;
  foreach section in array array['projects','posts','categories','experiences','educations','skills','courses','academicActivities','skillCategories'] loop
    if section in ('projects','categories','experiences','educations','skills') or new.data ? section then
      if jsonb_typeof(new.data->section) is distinct from 'array' then raise exception 'Invalid collection: %', section; end if;
      if jsonb_array_length(new.data->section) > 2000 then raise exception 'Collection too large'; end if;
      if (select count(*) <> count(distinct value->>'id') from jsonb_array_elements(new.data->section)) then raise exception 'Duplicate IDs in %', section; end if;
      for entry in select value from jsonb_array_elements(new.data->section) loop
        if jsonb_typeof(entry) is distinct from 'object' or jsonb_typeof(entry->'id') is distinct from 'string' or length(entry->>'id') = 0 then raise exception 'Invalid item ID'; end if;
        if section in ('projects','posts') and jsonb_typeof(entry->'title') is distinct from 'string' then raise exception 'Invalid title'; end if;
        foreach field in array array['draft','featured','current','emAndamento','emPlanejamento'] loop
          if entry ? field and jsonb_typeof(entry->field) is distinct from 'boolean' then raise exception 'Invalid boolean: %', field; end if;
        end loop;
        foreach field in array array['tags','stack','galleryImages','categoryIds'] loop
          if entry ? field then
            if jsonb_typeof(entry->field) is distinct from 'array' then raise exception 'Invalid array: %', field; end if;
            if exists(select 1 from jsonb_array_elements(entry->field) v where jsonb_typeof(v) <> 'string') then raise exception 'Invalid array item: %', field; end if;
          end if;
        end loop;
      end loop;
    end if;
  end loop;
  if octet_length(new.data::text) > 10000000 then raise exception 'Document exceeds 10 MB'; end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists validate_portfolio on public.portfolio;
create trigger validate_portfolio before insert or update on public.portfolio for each row execute function public.validate_portfolio_document();

create or replace function public.record_portfolio_revision() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if old.data is distinct from new.data then
    insert into public.portfolio_revisions(actor, old_data, changed_fields)
    values (auth.uid(), old.data, array(select key from (select jsonb_object_keys(old.data) key union select jsonb_object_keys(new.data) key) keys where old.data->key is distinct from new.data->key));
    delete from public.portfolio_revisions where id not in (select id from public.portfolio_revisions order by id desc limit 50);
  end if;
  return new;
end $$;
revoke all on function public.record_portfolio_revision() from public;
drop trigger if exists portfolio_revision on public.portfolio;
create trigger portfolio_revision after update on public.portfolio for each row execute function public.record_portfolio_revision();
commit;
