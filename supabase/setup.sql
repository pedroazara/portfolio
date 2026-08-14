-- =====================================================================
-- Setup do banco do portfólio no Supabase.
--
-- Como usar: painel do Supabase > SQL Editor > New query > cole tudo
-- isto > Run. É seguro rodar mais de uma vez.
--
-- Modelo de segurança: o site é público para leitura e privado para
-- escrita. Qualquer visitante lê o conteúdo; só uma sessão autenticada
-- pode gravar. A `anon key` que vai no navegador não dá poder de escrita
-- nenhum — quem decide isso são as políticas abaixo.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Tabela do currículo/portfólio
--
-- O site inteiro é um único documento JSON (perfil, projetos, posts...).
-- Guardar como jsonb numa linha só espelha exatamente como a aplicação
-- lê e grava — não vale a pena normalizar em dezenas de tabelas quando
-- toda edição salva o conjunto inteiro de uma vez.
-- ---------------------------------------------------------------------
create table if not exists public.portfolio (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.portfolio enable row level security;

-- Leitura pública: o portfólio é um site aberto.
drop policy if exists "portfolio_public_read" on public.portfolio;
create policy "portfolio_public_read"
  on public.portfolio
  for select
  to anon, authenticated
  using (true);

-- Escrita apenas para quem está autenticado.
drop policy if exists "portfolio_authenticated_write" on public.portfolio;
create policy "portfolio_authenticated_write"
  on public.portfolio
  for all
  to authenticated
  using (true)
  with check (true);


-- ---------------------------------------------------------------------
-- 2. Bucket de imagens
--
-- Público na leitura para que as URLs funcionem direto no <img> e sejam
-- servidas pelo CDN.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;

-- Leitura pública das imagens.
drop policy if exists "images_public_read" on storage.objects;
create policy "images_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'images');

-- Envio de novas imagens: só autenticado.
drop policy if exists "images_authenticated_insert" on storage.objects;
create policy "images_authenticated_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'images');

-- Substituição de imagem existente (upsert): só autenticado.
drop policy if exists "images_authenticated_update" on storage.objects;
create policy "images_authenticated_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'images')
  with check (bucket_id = 'images');

-- Exclusão: só autenticado.
drop policy if exists "images_authenticated_delete" on storage.objects;
create policy "images_authenticated_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'images');


-- ---------------------------------------------------------------------
-- 3. Trava de cadastro
--
-- O site tem um único administrador. Sem isto, qualquer pessoa com a
-- anon key (que é pública) poderia se cadastrar e ganhar permissão de
-- escrita pelas políticas acima.
--
-- Isto NÃO é feito por SQL: vá em Authentication > Sign In / Providers
-- e DESLIGUE "Allow new users to sign up". Crie seu usuário à mão em
-- Authentication > Users > Add user.
-- ---------------------------------------------------------------------
