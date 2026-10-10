# Tarefa: criar a skill `/portfolio` para atualizar meus projetos no portfólio

Você é um agente do Claude Code rodando na minha máquina. Quero que você **crie,
instale e teste uma skill pessoal** chamada `portfolio`. Com ela, dentro do
repositório de qualquer projeto que eu esteja desenvolvendo, eu digito
`/portfolio` e o post daquele projeto no meu site é atualizado.

Leia este documento inteiro antes de começar. Ele traz o contexto que você não
tem como adivinhar.

---

## 1. Contexto: o que já existe

Meu site pessoal (repositório `pedroazara/portfolio`, publicado na Vercel) guarda
todo o conteúdo num documento JSON no Supabase. O repositório tem dois
**servidores MCP** que deixam uma IA ler e editar esse conteúdo com as mesmas
regras do painel do site. A documentação completa está em `mcp/README.md` do
repositório do portfólio — **leia esse arquivo primeiro**.

Resumo das ferramentas (no Claude Code elas aparecem como
`mcp__portfolio-projects__<nome>` e `mcp__portfolio-media__<nome>`):

### `portfolio-projects`

| Ferramenta | Para quê |
| --- | --- |
| `list_projects` | Resumo de todos os projetos; filtro por texto |
| `get_project` | Projeto completo, por `slug` (código/id) **ou** `repoUrl` (remote do git, qualquer formato) |
| `list_categories` | IDs de categoria válidos |
| `create_project` | Cria projeto — nasce rascunho e "em andamento" |
| `update_project` | Altera só os campos enviados; `null` remove; listas são substituídas inteiras |
| `edit_project_text` | Troca um trecho exato do Markdown, ou acrescenta ao fim (sem `oldText`) |
| `upload_project_image` | Envia imagem (arquivo local ou URL) para a pasta do projeto; opcionalmente vira capa ou entra na galeria |
| `list_backups` / `restore_project` | Cópias locais anteriores a cada gravação / desfazer |

### `portfolio-media`

| Ferramenta | Para quê |
| --- | --- |
| `list_images` / `get_image` | Banco de imagens com onde cada uma é usada; `get_image` salva uma cópia local (`localPath`) que você pode abrir para **ver** a imagem |
| `upload_image` | Envia para qualquer pasta |
| `edit_image` | Girar, espelhar, recortar, redimensionar, converter (cria arquivo novo) |
| `crop_cover` | Recorte de capa 16:9 por foco/zoom ou região |
| `set_image` | Põe a imagem num lugar: capa do projeto, galeria etc. |
| `insert_image_in_text` | Insere `![legenda](db:...)` no Markdown, ao fim ou logo após um trecho (ex.: `## Resultados`) |
| `move_image` / `delete_image` | Mover atualizando referências / apagar (recusa se estiver em uso) |

Todas as ferramentas que gravam aceitam **`note`** (uma frase dizendo o que foi
feito e por quê — aparece na aba "Atividade" do meu painel) e **`dryRun`**
(mostra o que mudaria, sem gravar).

### Campos de um projeto (os que importam para a skill)

- `title` / `titleEn` — título.
- `description` / `descriptionEn` — resumo de 1–2 frases, mostrado nos cartões.
- `detailedDescription` / `detailedDescriptionEn` — **o corpo da página**, em Markdown.
- `scientificRelevance` / `scientificRelevanceEn` — seção "Relevância técnica e científica".
- `highlights` / `highlightsEn` — 3–5 destaques curtos.
- `stack` — ferramentas e tecnologias (nomes legíveis: "PyTorch", não `torch==2.1`).
- `tags` — temas (ex.: "Visão Computacional"), sem repetir o que está em `stack`.
- `categoryIds` — categorias (de `list_categories`).
- `situacao` — `planejamento` | `andamento` | `concluido`.
- `periodo` — `{ inicio: "AAAA-MM", fim?: "AAAA-MM" }`; sem `fim` a página mostra "Presente".
- `githubUrl`, `projectUrl` (demo/site), `documentationUrl`, `paperUrl`.
- `imageUrl` (capa), `galleryImages`, `galleryCaptions` / `galleryCaptionsEn`.
- `references` — lista `{ title, url }` exibida como "Referências".
- `draft` — `true` esconde do público.

### O que o Markdown do site suporta

- GitHub Flavored Markdown (tabelas, listas de tarefas etc.) e fórmulas KaTeX (`$...$`, `$$...$$`).
- Imagens: `![legenda](db:projects/<codigo>/arquivo.webp)` — **o texto alternativo vira a legenda** exibida.
- Vídeo do YouTube: a URL sozinha numa linha vira player; `[legenda](url-do-youtube)` sozinho numa linha também, com legenda.
- Blocos ` ```python ` aparecem com moldura de terminal (estáticos). ` ```pyresult ` é a saída gravada de um bloco Python — **só use com saída real**, nunca inventada.
- Outros blocos de código têm destaque de sintaxe pela linguagem.

---

## 2. Antes de criar a skill: verificar o ambiente

1. Descubra onde está o repositório do portfólio nesta máquina (pergunte se não
   souber). Garanta que ele tem a pasta `mcp/` — se não tiver, faça `git pull`
   (as mudanças estão na branch `claude/quirky-wozniak-ne0h4g`, ou na `main` se
   já tiverem sido integradas) e rode `npm install`.
2. Confira com `claude mcp list` se `portfolio-projects` e `portfolio-media`
   estão registrados **com escopo de usuário**. Se não estiverem, registre:
   ```
   claude mcp add portfolio-projects --scope user -- node "<caminho-do-portfolio>/mcp/run.mjs" projects
   claude mcp add portfolio-media    --scope user -- node "<caminho-do-portfolio>/mcp/run.mjs" media
   ```
   Servidores recém-registrados só carregam numa sessão nova: se precisar,
   peça para eu reiniciar o Claude Code e continue depois.
3. Confira se o `.env` do portfólio tem `VITE_SUPABASE_URL` e uma credencial
   (`PORTFOLIO_MCP_EMAIL` + `PORTFOLIO_MCP_PASSWORD` + `VITE_SUPABASE_ANON_KEY`,
   ou `SUPABASE_SERVICE_KEY`). **Não imprima os valores** — só diga o que falta.
4. Pergunte se eu já rodei `supabase/edit_log.sql` no Supabase (é o que
   alimenta a aba "Atividade"). Se não, me lembre; a skill funciona sem isso.
5. Faça uma chamada de leitura (`list_projects`) para confirmar que a conexão
   funciona.

---

## 3. O que a skill deve fazer

### Onde fica

- **Fonte versionada** no repositório do portfólio: `mcp/skills/portfolio/SKILL.md`
  (e arquivos de apoio, se fizer sentido — ex.: um `referencia.md` com a tabela
  de campos e de recursos de Markdown, para o `SKILL.md` ficar enxuto).
- **Instalada** como skill pessoal em `~/.claude/skills/portfolio/`
  (no Windows, `%USERPROFILE%\.claude\skills\portfolio\`), para funcionar em
  qualquer repositório. Copie os arquivos (symlink no Windows exige permissão
  extra) e documente como reinstalar depois de editar — um script
  `npm run skill:install` no portfólio é bem-vindo.
- Confirme na documentação da sua versão do Claude Code o formato atual de
  skills (frontmatter: `name`, `description`, `argument-hint`, `allowed-tools`
  etc.). Se a skill `skill-creator` estiver disponível, use-a.
- `description` deve deixar claro quando usar: "atualizar/sincronizar o post
  deste projeto no portfólio, adicionar imagens, referências, mudar situação,
  publicar".
- `allowed-tools`: pré-aprove só o que é **leitura** (as ferramentas `list_*`
  e `get_*` dos dois servidores e comandos `git` somente leitura). As que
  gravam continuam pedindo permissão normalmente.

### Passo 1 — identificar o projeto (sempre)

1. Se existir `.claude/portfolio.json` no repositório atual, use o `codigo` dele.
2. Senão, pegue o remote (`git remote get-url origin`) e chame
   `get_project` com `repoUrl`.
3. Não achou? Procure com `list_projects` (pelo nome do repositório) e me
   mostre os candidatos. Se nenhum servir, ofereça criar um projeto novo
   (`create_project`, **rascunho**) já com `githubUrl` preenchido.
4. Grave/atualize `.claude/portfolio.json` com
   `{ "codigo": "...", "ultimoCommitSincronizado": "<sha>", "sincronizadoEm": "<data ISO>" }`.
   Não faça commit desse arquivo por conta própria; avise que ele existe.

### Passo 2 — escolher o modo

**Modo pedido** — quando eu passo instruções: `/portfolio adiciona esta imagem ...`,
`/portfolio marca como concluído`, ou peço algo no meio da conversa. Faça o que
foi pedido, do jeito mais direto. Exemplos de mapeamento:

| Eu peço | Você faz |
| --- | --- |
| "adiciona esta imagem `C:\...\resultado.png` na seção Resultados" | `upload_project_image` → `insert_image_in_text` duas vezes: em `detailedDescription` (`after: "## Resultados"`, legenda PT) e em `detailedDescriptionEn` (`after: "## Results"`, legenda EN). Pergunte a legenda se não for óbvia |
| "põe na galeria" | `upload_project_image` com `use: "gallery"`, `caption` e `captionEn` |
| "usa como capa" | enviar → `get_image` (abra o `localPath` para ver) → `crop_cover` com foco escolhido → `set_image` `project.cover` |
| "adiciona a referência X" | leia `references`, acrescente `{ title, url }` sem duplicar, `update_project` |
| "marca como concluído" | `situacao: "concluido"` e proponha `periodo.fim` (data do último commit) |
| "publica" | `draft: false` — **só** quando eu pedir explicitamente |
| "desfaz" | `list_backups` → `restore_project` (mostre antes o que vai voltar) |
| "muda o link para X" | `codigo` (o endereço antigo continua funcionando) |

**Modo sincronizar** — `/portfolio` sem instruções (ou "sincroniza",
"atualiza com o estado atual"). Compare o repositório com o post e proponha
atualizações:

1. **Levante o estado do repositório:**
   - `git log` desde `ultimoCommitSincronizado` (ou os ~30 últimos commits na
     primeira vez), branches/tags/releases relevantes;
   - README, `docs/`, CHANGELOG, notebooks e relatórios de resultados;
   - manifests (`package.json`, `requirements.txt`, `pyproject.toml`,
     `Cargo.toml`...) para a `stack`;
   - imagens candidatas (capturas de tela, gráficos de resultados, diagramas em
     `docs/`, `assets/`, `results/`, imagens referenciadas no README). Ignore
     ícones, logos e badges (shields.io etc.);
   - links: demo/deploy, documentação, artigos (arXiv/DOI), datasets e
     trabalhos citados no README;
   - datas: primeiro commit (`periodo.inicio`) e atividade recente (para
     sugerir a `situacao`).
2. **Leia o post atual** com `get_project` (completo) e, na primeira vez, leia
   1–2 outros projetos publicados para imitar a estrutura e o tom do site.
3. **Monte um plano** e me mostre antes de gravar, em lista curta: o que está
   desatualizado ou faltando, campo por campo (resumo, corpo, stack, situação,
   período, links, destaques, referências, imagens novas, capa), com o texto
   proposto. Use `dryRun: true` nas alterações grandes para mostrar o efeito.
4. **Espere minha confirmação** (posso aceitar tudo, parte, ou ajustar). Depois
   aplique e registre o commit sincronizado em `.claude/portfolio.json`.

### Passo 3 — relatório

Ao final, mostre: o que mudou (campo a campo, em uma linha cada), os links da
página e do editor (vêm nas respostas das ferramentas), se o projeto está como
rascunho ou publicado, e como desfazer (`/portfolio desfaz`).

---

## 4. Regras de escrita e de segurança

- **Fidelidade:** só escreva o que está no repositório ou o que eu disse. Não
  invente métricas, resultados, datas, colaboradores nem citações. Se faltar
  informação, pergunte ou deixe de fora.
- **Respeite o que eu escrevi:** o corpo da página costuma ter texto meu. Prefira
  `edit_project_text` para mudanças pontuais e para acrescentar seções; reescrever
  o `detailedDescription` inteiro só com minha aprovação explícita.
- **Bilíngue sempre:** toda alteração em português tem a contrapartida em inglês
  (`titleEn`, `descriptionEn`, `detailedDescriptionEn`, `scientificRelevanceEn`,
  `highlightsEn`, `captionEn`). Inglês natural, não tradução literal.
- **Tom do site:** português claro, técnico sem jargão gratuito, frases curtas.
  O resumo (`description`) tem 1–2 frases. Siga a estrutura de seções dos outros
  projetos.
- **Publicação:** nunca mude `draft` para `false` sem eu pedir.
- **Nada sensível:** não copie para o post segredos, chaves, `.env`, URLs
  internas, dados pessoais de terceiros ou trechos de código proprietário. Na
  dúvida, pergunte.
- **Imagens:** mais de 3 imagens novas numa sincronização → me mostre a lista e
  deixe eu escolher. Sempre com legenda PT e EN. Use `keepFormat: true` para
  diagramas com texto fino. Não apague imagens sem confirmação.
- **Referências:** formato `{ title, url }`, títulos legíveis (autor/ano ou nome
  oficial), sem duplicar as existentes.
- **Toda gravação leva `note`**, curta e específica (ex.: "Acrescenta resultados
  do treino v3 (mAP 0,72) a partir do README").
- **Desfazer é fácil:** cada gravação devolve `backupPath`; guarde-o para o
  relatório.

---

## 5. Testes antes de me entregar

Teste num repositório real meu que já tenha post no portfólio (pergunte qual).
Não publique nada nem faça alterações grandes nos testes; prefira um projeto
em rascunho ou desfaça depois.

1. `/portfolio` (sincronizar) com `dryRun`: identifica o projeto pelo remote,
   mostra o plano e **não grava nada**.
2. Uma alteração pequena de verdade, com `note`. Confira na página do site e na
   aba **Atividade** do painel (`/admin/painel/atividade`) que a edição aparece
   como **Claude Code** — não como "Você". Isso confirma que a identificação do
   agente chega ao Supabase; se aparecer como "Você" ou "Sistema", me avise.
3. Modo pedido: adicionar uma imagem com legenda numa seção e uma referência.
4. Desfazer com `restore_project` e confirmar que voltou ao estado anterior.
5. Um repositório sem post: deve oferecer criar como rascunho (pode cancelar).

---

## 6. Entrega

Me diga em poucas linhas:

- os arquivos criados (fonte no portfólio + instalação em `~/.claude/skills/portfolio/`);
- como usar (`/portfolio`, `/portfolio <pedido>`) com 3 exemplos;
- o resultado de cada teste da seção 5, incluindo o que falhou ou ficou pendente;
- o que você ajustou neste plano e por quê.

Faça commit da fonte da skill no repositório do portfólio numa branch nova e me
pergunte antes de abrir PR ou fazer push.
