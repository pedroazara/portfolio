# Ferramentas, campos e Markdown

## Ferramentas

Todas as que gravam aceitam `note` (frase do que foi feito, aparece no painel)
e, quase todas, `dryRun` (mostra o efeito sem gravar). Cada gravação devolve
`backupPath`, uma cópia local do documento anterior.

### `portfolio-projects`

| Ferramenta | Uso |
| --- | --- |
| `list_projects` | Resumo de todos; filtro `query` por título, código, repositório, tags, stack |
| `get_project` | Projeto completo por `slug` (código, id ou código antigo) **ou** `repoUrl` (https, `git@`, com/sem `.git`). Devolve `links.page` e `links.editor` |
| `list_categories` | IDs aceitos em `categoryIds` |
| `create_project` | Cria; nasce `draft: true` e em andamento; `codigo` sai do título se não vier |
| `update_project` | `changes` com só os campos a mudar; `null` remove; listas substituem inteiras |
| `edit_project_text` | `field` + `oldText` (trecho exato, único) + `newText`; sem `oldText`, acrescenta ao fim |
| `upload_project_image` | `filePath` (absoluto) ou `url` https → `projects/<codigo>/`; `use: "cover" \| "gallery" \| "none"`, `caption`, `captionEn`, `keepFormat` |
| `list_backups` / `restore_project` | Cópias locais / devolve um projeto ao estado de uma cópia |

Campos aceitos por `edit_project_text`: `detailedDescription`,
`detailedDescriptionEn`, `description`, `descriptionEn`, `scientificRelevance`,
`scientificRelevanceEn`.

### `portfolio-media`

| Ferramenta | Uso |
| --- | --- |
| `list_images` | Banco de imagens com `usedIn` (onde cada uma aparece); `folder`, `unusedOnly` |
| `get_image` | Dimensões, formato, URL, usos, recorte de capa e `localPath` — abra esse arquivo para **ver** a imagem |
| `upload_image` | Envia para qualquer pasta (padrão `geral/`) |
| `edit_image` | `rotate`, `flipHorizontal`, `flipVertical`, `crop {left,top,width,height}`, `resize {width,height}`, `format`, `quality`; cria arquivo novo; `replaceReferences: true` troca no site todo |
| `crop_cover` | Capa 16:9 (1600×900): `focusX`/`focusY` (0–1), `zoom` (≥1) ou `region`; salva `<original>.capa.webp` |
| `set_image` | `slot`: `profile.avatar`, `profile.badge`, `project.cover`, `project.gallery`, `post.cover`, `experience.gallery`, `activity.gallery`; `slug`; `ref` (`null` limpa); galeria: `remove`, `position`, `caption`, `captionEn` |
| `insert_image_in_text` | `target: "project" \| "post"`, `slug`, `field`, `alt` (vira legenda), `after` (trecho único; a imagem entra depois da linha dele) |
| `move_image` | Move/renomeia levando o recorte de capa e atualizando as referências |
| `delete_image` | Apaga; recusa se estiver em uso (a não ser com `force`) |

Envios convertem PNG/JPG/WebP para WebP de até 1600 px (como o painel); GIF,
SVG e PDF sobem intactos. Nome repetido ganha sufixo — nada é sobrescrito.

## Campos de um projeto

| Campo | O que é |
| --- | --- |
| `title` / `titleEn` | Título |
| `codigo` | Trecho do link: `/projetos/<codigo>` |
| `description` / `descriptionEn` | Resumo de 1–2 frases (cartões e prévias) |
| `detailedDescription` / `detailedDescriptionEn` | Corpo da página, em Markdown |
| `scientificRelevance` / `scientificRelevanceEn` | Seção "Relevância técnica e científica" |
| `highlights` / `highlightsEn` | 3–5 destaques curtos |
| `stack` | Ferramentas e tecnologias ("PyTorch", "OpenCV") |
| `tags` | Temas ("Visão Computacional"); não repetir o que está em `stack` |
| `categoryIds` | Categorias (`list_categories`); a primeira é a principal |
| `situacao` | `planejamento` \| `andamento` \| `concluido` |
| `periodo` | `{ inicio: "AAAA-MM", fim?: "AAAA-MM" }`; sem `fim` aparece "Presente" |
| `githubUrl`, `projectUrl`, `documentationUrl`, `paperUrl` | Repositório, demo/site, documentação, artigo |
| `imageUrl` | Capa (`db:...` ou URL https) |
| `galleryImages`, `galleryCaptions`, `galleryCaptionsEn` | Galeria e legendas (chaveadas pela referência da imagem) |
| `references` | Lista `{ title, url }` exibida como "Referências" |
| `featured` | Aparece entre os destaques da home |
| `draft` | `true` esconde do público |
| `blogPostId` | Post do blog relacionado |

## Markdown que o site renderiza

- GitHub Flavored Markdown: títulos, listas, tabelas, listas de tarefas, citações.
- Fórmulas KaTeX: `$E = mc^2$` na linha, `$$...$$` em bloco.
- Imagens: `![legenda](db:projects/<codigo>/arquivo.webp)` — **o texto
  alternativo aparece como legenda** abaixo da imagem.
- YouTube: a URL sozinha numa linha vira player; `[legenda](url)` sozinho numa
  linha também, com legenda.
- ` ```python ` aparece com moldura de terminal (estático, não executa na
  página). ` ```pyresult ` é a saída gravada de um bloco Python — só com saída real.
- Outros blocos de código têm destaque pela linguagem (` ```bash `, ` ```ts `…).
