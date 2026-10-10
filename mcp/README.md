# Servidores MCP do portfólio

Permitem que uma IA (Claude Code, Claude Desktop ou outro cliente MCP) leia e
edite o conteúdo do site sem passar pelo painel: atualizar a página de um
projeto, enviar prints, recortar capas, reorganizar o banco de imagens.

| Servidor | Comando | O que faz |
| --- | --- | --- |
| `portfolio-projects` | `node mcp/run.mjs projects` | Projetos: listar, ler, criar, alterar campos, editar trechos do Markdown, enviar imagens do projeto |
| `portfolio-media` | `node mcp/run.mjs media` | Imagens do site inteiro: listar, ver, enviar, editar, recortar capa, mover, apagar, colocar em qualquer lugar do conteúdo |
| `portfolio-painel` | `node mcp/run.mjs painel` | Atualizações diárias do painel pessoal (a dica de inglês e outras séries) |

Planejado: `blog` (posts).

## Como funciona

```
 Claude Code ──stdio──▶ node mcp/run.mjs projects ──HTTPS──▶ Supabase
 (sua máquina)          (processo local)                    ├─ tabela portfolio (linha "main")
                                                            └─ bucket images
                                                                   │
                                          site na Vercel ◀── lê ───┘
```

1. O cliente MCP inicia o servidor como um processo na sua máquina e conversa
   com ele por stdin/stdout, em JSON-RPC. Nada fica exposto na internet.
2. Ao conectar, o servidor anuncia as ferramentas (nome, descrição, parâmetros)
   e um texto de instruções. A IA decide quando chamar cada uma.
3. Cada ferramenta lê ou grava no Supabase — o mesmo documento que o painel
   edita. O site publicado lê dali, então a alteração aparece sem deploy.
   (Páginas pré-renderizadas para SEO só se atualizam no próximo build.)

O servidor segue as regras do painel:

- **Mesma validação.** O documento passa por `parseResumeData`
  (`src/lib/contentSchema.ts`) antes de ser gravado.
- **Sem atropelar o painel.** A gravação é condicionada ao `updated_at` lido;
  se o painel salvou no meio-tempo, o servidor relê e reaplica a alteração.
  No sentido inverso, um painel aberto durante a edição de um agente avisa
  que há uma versão mais nova e pede para recarregar, em vez de sobrescrevê-la.
- **Mesmos endereços.** O `codigo` sai do título com o mesmo `slugify` do
  formulário, e renomear guarda o código antigo em `codigosAntigos`.
- **Mesmas imagens.** PNG/JPG/WebP viram WebP de até 1600 px; capas são
  recortes 16:9 salvos como `<original>.capa.webp`; o conteúdo cita arquivos
  como `db:<caminho>`.

## Instalação

Pré-requisito: Node 20 ou mais novo e as dependências instaladas neste
repositório (`npm install`).

### 1. Credencial (`.env` na raiz do portfólio)

O servidor lê o mesmo `.env` do site, esteja onde estiver a pasta atual.
Precisa de `VITE_SUPABASE_URL` e de **uma** das credenciais abaixo:

```env
# Recomendado: login do administrador (o mesmo do painel).
# Passa pelas políticas RLS e fica registrado como autor nas revisões.
VITE_SUPABASE_ANON_KEY="..."
PORTFOLIO_MCP_EMAIL="seu-email-de-admin"
PORTFOLIO_MCP_PASSWORD="sua-senha"

# Alternativa: a chave de serviço que os scripts já usam (ignora o RLS).
SUPABASE_SERVICE_KEY="..."
```

O `.env` está no `.gitignore`; essas credenciais nunca saem da sua máquina.

### 2. Registrar no Claude Code

Com escopo de usuário, os servidores ficam disponíveis em qualquer pasta —
é o que permite atualizar o portfólio de dentro do repositório de outro projeto.
Use o caminho absoluto deste repositório:

```bash
# Windows (PowerShell)
claude mcp add portfolio-projects --scope user -- node "C:\caminho\para\portfolio\mcp\run.mjs" projects
claude mcp add portfolio-media    --scope user -- node "C:\caminho\para\portfolio\mcp\run.mjs" media
claude mcp add portfolio-painel   --scope user -- node "C:\caminho\para\portfolio\mcp\run.mjs" painel

# macOS / Linux
claude mcp add portfolio-projects --scope user -- node /caminho/para/portfolio/mcp/run.mjs projects
claude mcp add portfolio-media    --scope user -- node /caminho/para/portfolio/mcp/run.mjs media
claude mcp add portfolio-painel   --scope user -- node /caminho/para/portfolio/mcp/run.mjs painel
```

Confira com `claude mcp list` ou, dentro do Claude Code, `/mcp`.

**Claude Desktop:** em `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "portfolio-projects": { "command": "node", "args": ["C:\\caminho\\para\\portfolio\\mcp\\run.mjs", "projects"] },
    "portfolio-media": { "command": "node", "args": ["C:\\caminho\\para\\portfolio\\mcp\\run.mjs", "media"] },
    "portfolio-painel": { "command": "node", "args": ["C:\\caminho\\para\\portfolio\\mcp\\run.mjs", "painel"] }
  }
}
```

Não há passo de build: `run.mjs` carrega os arquivos TypeScript na hora, então
depois de um `git pull` basta reiniciar o cliente.

### 3. Testar sem IA (opcional)

```bash
npx @modelcontextprotocol/inspector node mcp/run.mjs projects
```

Abre uma página onde dá para chamar cada ferramenta à mão.

## Ferramentas

### `portfolio-projects`

| Ferramenta | Uso |
| --- | --- |
| `list_projects` | Resumo de todos os projetos; filtra por texto (título, código, repositório, tags) |
| `get_project` | Projeto completo, por `slug` (código/id/código antigo) **ou** `repoUrl` (o remote do git, em qualquer formato) |
| `list_categories` | IDs de categoria aceitos |
| `create_project` | Cria um projeto — nasce **rascunho** e "em andamento" |
| `update_project` | Altera só os campos enviados; `null` remove um campo; `situacao` = `planejamento` / `andamento` / `concluido` |
| `edit_project_text` | Troca um trecho exato do Markdown, ou acrescenta ao fim — sem reenviar o texto inteiro |
| `upload_project_image` | Envia imagem (arquivo ou URL) para `projects/<codigo>/` e, opcionalmente, já põe como capa ou na galeria |
| `list_backups` | Cópias locais salvas antes de cada gravação |
| `restore_project` | **Desfaz**: devolve um projeto ao estado de uma cópia, sem mexer no resto do site |

### `portfolio-media`

| Ferramenta | Uso |
| --- | --- |
| `list_images` | Imagens do bucket com **onde cada uma é usada**; filtros por pasta e "só as não usadas" |
| `get_image` | Dimensões, formato, URL, usos, recorte de capa — e uma **cópia local** que a IA pode abrir para ver |
| `upload_image` | Envia para qualquer pasta (`geral/` por padrão) |
| `edit_image` | Girar, espelhar, recortar, redimensionar, converter. Cria arquivo novo; `replaceReferences` faz o site usar a versão nova |
| `crop_cover` | Recorte de capa 16:9 (1600×900), por foco + zoom ou região exata |
| `move_image` | Move/renomeia, leva junto o recorte de capa e **atualiza todas as referências** |
| `delete_image` | Apaga; **recusa** se a imagem estiver em uso (a não ser com `force`) |
| `set_image` | Põe a imagem num lugar: avatar, ícone do perfil, capa de projeto/post, galeria de projeto/experiência/atividade |
| `insert_image_in_text` | Insere `![legenda](db:...)` no Markdown de projeto ou post, ao fim ou depois de um trecho (ex.: `## Resultados`) |

### `portfolio-painel`

| Ferramenta | Uso |
| --- | --- |
| `list_daily_updates` | Atualizações já publicadas, por série; serve para não repetir um tema recente |
| `publish_daily_update` | Publica a atualização do dia de uma série (`ingles`, por exemplo). Uma por série e por dia: publicar de novo substitui |

As atualizações aparecem na aba **Atualizações** do painel
(`/admin/painel/atualizacoes`), com selo de nova até você abrir a aba. Rode
**uma vez** `supabase/daily_updates.sql` no SQL Editor para criar a tabela.

Toda ferramenta do `portfolio-projects` e do `portfolio-media` que grava aceita `note`: uma frase do agente dizendo o que fez
e por quê, que aparece no registro de edições.

## Registro de edições ("quem mexeu")

A aba **Atividade** do painel (`/admin/painel/atividade`) mostra cada edição
do portfólio com o autor:

- **Você** — gravações pelo painel do site. O salvamento automático grava a
  cada pausa na digitação; gravações seguidas nos mesmos itens, com menos de
  15 minutos entre elas, aparecem como uma linha só ("7 gravações desde 16:57").
- **Cada agente** — Claude Code, Claude Desktop etc., com a versão, a
  **sessão** (cada conversa inicia o próprio processo do servidor, com um id
  próprio), a ferramenta usada e a nota. Operações só de arquivo (enviar,
  recortar, apagar imagem) também entram.
- **Sistema** — scripts com a chave de serviço ou o SQL Editor.

Cartões no topo resumem por autor (edições, sessões, última atividade) e
filtram a lista. Cada linha diz o que mudou — "alterou projeto “YOLOcraft” —
texto da página, título (EN)" — com link para a página.

Como funciona: um gatilho no banco (`supabase/edit_log.sql`) anota toda
gravação na tabela `portfolio`, venha de onde vier, comparando a versão
anterior com a nova item a item. Os servidores MCP se identificam no
cabeçalho `x-portfolio-edit`; sem ele, a gravação é sua (sessão do painel) ou
do sistema. Um erro no registro nunca impede a gravação. Para dar um nome
fixo a um agente (ex.: "Claude no notebook"), defina `PORTFOLIO_MCP_AGENT` no
`.env` da máquina dele.

## Segurança e desfazer

- **Rascunho por padrão.** Projetos criados pela IA não ficam públicos até
  alguém pedir `draft: false`.
- **Simulação.** As ferramentas que gravam conteúdo aceitam `dryRun: true`.
- **Nada é sobrescrito no Storage.** Envios e edições com nome repetido ganham
  sufixo. (A exceção é o recorte de capa, que o painel também substitui no
  mesmo caminho.)
- **Cópia antes de cada gravação.** O documento anterior é salvo em
  `mcp/.history/` (as 50 últimas; fora do git). A resposta traz o
  `backupPath`; `restore_project` usa essa cópia para desfazer — é só pedir
  "desfaz a última alteração no projeto X".
- O painel continua tendo backups diários e, se `supabase/technical-upgrade.sql`
  tiver sido aplicado, o histórico de revisões no próprio banco.

## Vercel e Supabase

- **Vercel:** nada a configurar. Os servidores não são publicados — o SDK do
  MCP é dependência de desenvolvimento e nenhum arquivo de `mcp/` entra no
  build. A aba Atividade vai junto com o próximo deploy do site.
- **Supabase:** rode **uma vez** `supabase/edit_log.sql` no SQL Editor (cria a
  tabela do registro e o gatilho; pode rodar de novo sem problema). Sem ele,
  os MCPs funcionam normalmente e a aba Atividade mostra como ativar. O resto
  usa o que já existe: tabela `portfolio`, bucket `images` e o usuário do
  painel para o login do administrador.

## Próximos servidores

A pasta `core/` concentra o que é comum: credenciais (`supabase.ts`), leitura
e gravação segura do documento (`portfolioDocument.ts`), arquivos do bucket
(`images.ts`) e referências `db:` (`references.ts`). Um servidor novo
(`blog/`) só precisa das próprias regras e de uma linha em
`run.mjs`. As regras de cada servidor ficam em funções puras
(`projectOps.ts`, `mediaOps.ts`) testadas com `npm test`, sem rede.
