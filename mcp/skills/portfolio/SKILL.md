---
name: portfolio
description: "Cria e atualiza o post de um projeto no meu portfólio a partir do repositório ou de pedidos: textos PT/EN, imagens, capa, referências, situação e publicação."
compatibility: "Requer os servidores MCP portfolio-projects e portfolio-media (repositório pedroazara/portfolio, pasta mcp/) rodando na máquina do usuário."
---

# Portfólio: criar e atualizar posts de projetos

Esta skill mantém a página de cada projeto no meu site pessoal. Ela trabalha
pelos servidores MCP do portfólio, que leem e gravam no mesmo lugar que o
painel do site — o que você grava aparece no site na hora.

Antes de agir, leia:

- `references/ferramentas.md` — as ferramentas, os campos de um projeto e o
  Markdown que o site aceita;
- `references/modelo-de-post.md` — estrutura, tom e exemplos de um post.

## 0. Confira as ferramentas

Procure as ferramentas `mcp__portfolio-projects__*` e `mcp__portfolio-media__*`
(em alguns clientes aparecem só com o nome, como `get_project`). Se não
estiverem disponíveis, **pare** e explique:

- a skill depende de dois servidores MCP que rodam no meu computador;
- funcionam no Claude Code ou no Claude Desktop dessa máquina, depois de
  registrados — o passo a passo está em `mcp/README.md` do repositório do
  portfólio;
- no claude.ai pela web ou pelo celular eles não estão acessíveis.

Faça uma leitura (`list_projects`) para confirmar que a conexão funciona.

## 1. Escolha o modo

Olhe o que veio junto com o pedido (o texto depois de `/portfolio`):

| Entrada | Modo |
| --- | --- |
| `novo`, `novo "Título"`, "cria o post deste projeto" | **Criar** (seção 4) |
| um pedido em texto livre ("adiciona esta imagem…", "publica") | **Pedido** (seção 3) |
| nada, "sincroniza", "atualiza com o estado atual" | **Sincronizar** (seção 5) |

Os modos sincronizar e criar a partir do repositório precisam de acesso aos
arquivos e ao `git` (Claude Code). Sem isso, trabalhe só com o que eu disser.

## 2. Identifique o projeto

Sempre que houver um repositório na pasta atual:

1. Se existir `.claude/portfolio.json`, use o `codigo` dele.
2. Senão, pegue o remote (`git remote get-url origin`) e chame `get_project`
   com `repoUrl`.
3. Não achou: procure com `list_projects` pelo nome do repositório e por
   palavras do título, e me mostre os candidatos. Se o projeto existir sem
   `githubUrl`, ofereça preencher. Se nenhum servir, ofereça o modo criar.
4. Depois de identificar (ou criar), grave `.claude/portfolio.json`:
   `{ "codigo": "...", "ultimoCommitSincronizado": "<sha do HEAD>", "sincronizadoEm": "<data ISO>" }`.
   Não faça commit dele; avise que existe.

Sem repositório, pergunte qual projeto (ou use `list_projects` com o que eu
disser).

## 3. Modo pedido

Faça o que pedi, do jeito mais direto, e leia o projeto (`get_project`) antes
de alterar.

| Pedido | Como fazer |
| --- | --- |
| Imagem numa seção do texto | `upload_project_image` → `insert_image_in_text` duas vezes: em `detailedDescription` (`after: "## Resultados"`, legenda PT) e em `detailedDescriptionEn` (`after: "## Results"`, legenda EN) |
| Imagem na galeria | `upload_project_image` com `use: "gallery"`, `caption` e `captionEn` |
| Nova capa | enviar → `get_image` (abra o `localPath` para ver) → `crop_cover` com o foco certo → `set_image` com `slot: "project.cover"` |
| Referência | leia `references`, acrescente `{ title, url }` sem duplicar, `update_project` |
| Mudar a situação | `situacao: "planejamento" \| "andamento" \| "concluido"`; ao concluir, proponha `periodo.fim` |
| Publicar | `draft: false` — **só** com pedido explícito |
| Trocar o link | `codigo` (o endereço antigo continua funcionando) |
| Corrigir um trecho | `edit_project_text` com o trecho exato (`oldText`) |
| Desfazer | `list_backups` → mostre o que vai voltar → `restore_project` |

Se o pedido for ambíguo (qual seção? qual legenda?), pergunte antes.

## 4. Modo criar

Monta o post completo de um projeto novo.

1. **Evite duplicata:** confira com `list_projects` que não há projeto
   parecido (mesmo repositório, título semelhante).
2. **Levante o material.** Com repositório: histórico inteiro (primeiro commit,
   marcos), README, `docs/`, resultados, manifests para a stack, imagens, links
   e trabalhos citados (detalhes na seção 5, passo 1). Sem repositório: pergunte
   o essencial — objetivo, o que já existe, tecnologias previstas, links — e use
   `situacao: "planejamento"`.
3. **Imite o site:** leia 1–2 projetos publicados com `get_project` e use
   `list_categories` para escolher as categorias.
4. **Proponha o post inteiro antes de criar**, seguindo
   `references/modelo-de-post.md`: título, `codigo`, resumo, corpo com seções,
   relevância técnica quando fizer sentido, destaques, stack, tags, categorias,
   situação, período, links, referências e imagens candidatas com legendas —
   tudo em PT e EN.
5. **Com minha confirmação:** `create_project` com os textos (sempre
   `draft: true`) → `upload_project_image` → capa (`crop_cover` + `set_image`)
   → galeria → imagens no corpo com `insert_image_in_text` (PT e EN) → grave
   `.claude/portfolio.json`.
6. Passe o link do editor (`/admin/projetos/<codigo>`) para eu revisar.

## 5. Modo sincronizar

Compara o repositório com o post e propõe atualizações.

1. **Estado do repositório:**
   - `git log` desde `ultimoCommitSincronizado` (ou os ~30 últimos commits na
     primeira vez), tags e releases;
   - README, `docs/`, CHANGELOG, notebooks, relatórios de resultados;
   - manifests (`package.json`, `requirements.txt`, `pyproject.toml`,
     `Cargo.toml`…) para a `stack` — nomes legíveis, só o principal;
   - imagens candidatas: capturas de tela, gráficos, diagramas em `docs/`,
     `assets/`, `results/` e as citadas no README. Ignore ícones, logos e badges;
   - links: demo/deploy, documentação, artigos (arXiv/DOI), datasets;
   - datas: primeiro commit (`periodo.inicio`) e atividade recente (para sugerir
     a `situacao`).
2. **Post atual:** `get_project` completo.
3. **Plano:** me mostre, em lista curta, o que está desatualizado ou faltando,
   campo por campo, com o texto proposto. Use `dryRun: true` nas alterações
   grandes para mostrar o efeito.
4. **Com minha confirmação**, aplique (pode ser só parte do plano) e atualize
   `ultimoCommitSincronizado` em `.claude/portfolio.json`.

## 6. Regras

- **Fidelidade:** só escreva o que está no repositório ou o que eu disse. Nada
  de métricas, resultados, datas, colaboradores ou citações inventados. Faltou
  informação: pergunte ou deixe de fora. Bloco ` ```pyresult ` só com saída real.
- **Respeite meu texto:** prefira `edit_project_text` para mudanças pontuais e
  para acrescentar seções. Reescrever o `detailedDescription` inteiro só com
  aprovação explícita.
- **Bilíngue sempre:** toda mudança em PT tem a contrapartida em EN, em inglês
  natural.
- **Rascunho por padrão:** nunca mude `draft` para `false` sem pedido.
- **Nada sensível:** não leve para o post segredos, chaves, `.env`, URLs
  internas, dados pessoais de terceiros ou código proprietário.
- **Imagens:** mais de 3 novas de uma vez → mostre a lista e deixe eu escolher.
  Sempre com legenda PT e EN; `keepFormat: true` para diagramas com texto fino.
  Não apague imagens sem confirmação.
- **Referências:** `{ title, url }`, títulos legíveis, sem duplicar.
- **Toda gravação leva `note`**: uma frase curta e específica, que aparece na
  aba "Atividade" do meu painel.

## 7. Relatório

Ao terminar, mostre em poucas linhas: o que mudou (um campo por linha), os
links da página e do editor (vêm nas respostas das ferramentas), se o projeto
está em rascunho ou publicado, e que dá para desfazer com `/portfolio desfaz`.
