# Especificação do pacote

Estas medidas vêm do código do site (`src/lib/coverPack.ts`). A ferramenta
que aplica o pacote (`apply_cover_pack`) confere cada uma.

## Arquivos

| Arquivo | viewBox | Onde aparece | Obrigatório |
| --- | --- | --- | --- |
| `card-light.svg` | `0 0 1600 900` (16:9) | Cartões da lista de projetos e dos destaques da home, slides do pitch | **sim** |
| `card-dark.svg` | `0 0 1600 900` | O mesmo, no tema escuro | recomendado |
| `card-mobile-light.svg` | `0 0 1200 900` (4:3) | Cartão no celular (telas com menos de 640 px), na largura toda | recomendado |
| `card-mobile-dark.svg` | `0 0 1200 900` | O mesmo, no tema escuro | recomendado |
| `hero-light.svg` | `0 0 1600 900` (16:9) | Topo da página do projeto, até ~1300 px de largura | recomendado |
| `hero-dark.svg` | `0 0 1600 900` | O mesmo, no tema escuro | recomendado |
| `square-light.svg` | `0 0 1200 1200` (1:1) | Miniaturas (73 px no painel) e posts em redes | opcional |
| `square-dark.svg` | `0 0 1200 1200` | O mesmo, no tema escuro | opcional |
| `og.svg` | `0 0 1200 630` | Prévia do link (WhatsApp, LinkedIn, X). Só tema claro: vira JPEG | recomendado |
| `pack.json` | — | `{ "projeto": "<codigo>", "titulo": "...", "versao": 1 }` | recomendado |
| `prancha.html` | — | Revisão; o portfólio ignora | opcional |

O que falta tem substituto: o topo da página e o quadrado usam o cartão; sem
`og.svg`, a prévia é o cartão claro recortado em 1200×630; sem a versão
escura, a clara aparece nos dois temas. Mas o pacote só resolve o problema
inteiro com as versões escuras e o topo.

Nomes exatamente assim, em minúsculas, com hífen. Os arquivos podem estar na
raiz do `.zip` ou numa pasta dentro dele. Qualquer outra imagem com nome
diferente faz o pacote ser recusado (para nenhuma arte sumir sem aviso).

## Composição de cada quadro

O site desenha o quadro com cantos arredondados e a arte preenche tudo, sem
corte: a proporção do arquivo é a do quadro.

### Cartão (`card`, 16:9)

- Visto com 320 a 560 px de largura. Pense em ícone grande, não em pôster.
- Nos destaques da home, a imagem cresce 3% ao passar o mouse: nada essencial
  a menos de **64 unidades** das bordas.
- Cantos arredondados de 16 px no site: não encoste detalhes nos cantos.
- Traços com **4 unidades ou mais** (a 450 px de largura, 4 unidades viram
  pouco mais de 1 px).
- Abaixo do cartão o site já escreve categoria, título e resumo: **sem texto
  na arte**.

### Cartão no celular (`card-mobile`, 4:3)

- Ocupa a largura do celular (330 a 600 px). Mais alto que o 16:9: aproxime o
  objeto, não acrescente fundo.
- Mesmas margens e traços do cartão.

### Topo da página (`hero`, 16:9)

- Pode ter mais detalhe: aparece grande, até ~1300 px de largura.
- **Os 20% de baixo (y > 720) ficam sob o painel do título** no celular (no
  computador, uns 8%). Ali, só fundo ou a continuação suave dele.
- Cantos de 24 px no site.
- Sem texto: o título está no painel logo abaixo.

### Quadrado (`square`, 1:1)

- Um símbolo central, que se reconheça com 73 px. Margem de 120 unidades.
- Traços com 8 unidades ou mais.

### Prévia do link (`og`, 1200×630)

- Só tema claro: as redes não têm tema.
- O WhatsApp às vezes mostra só o quadrado do meio: o essencial entre
  **x = 285 e x = 915**.
- Margem de 60 unidades.
- A rede mostra o título e a descrição ao lado: texto na arte é dispensável.
  Se quiser o nome do projeto, desenhe-o com formas (veja "Texto").
- Vira JPEG de até 300 kB: texturas finas e gradientes muito longos pesam.

## Regras técnicas dos SVGs

O site mostra cada SVG dentro de `<img>`. Ali não rodam scripts, não carregam
fontes da web nem arquivos externos — e o arquivo fica num link público.

Obrigatório:

- Raiz assim, com as medidas da tabela:
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">`
  (`width`/`height` iguais ao `viewBox`).
- **Fundo cheio**: o primeiro elemento é um `<rect>` do tamanho do `viewBox`
  com a cor de fundo. Nada de fundo transparente.
- Tudo dentro do arquivo: gradientes, padrões e máscaras em `<defs>`, com ids
  únicos (`card-grad-1`); referências só internas (`url(#card-grad-1)`).

Recusado pelo portfólio:

- `<script>`, atributos de evento (`onload`, `onclick`...), `javascript:`;
- `<foreignObject>`, `<iframe>`, `<video>` e outro HTML embutido;
- `href` ou `url(...)` para fora do arquivo, `@import`, fontes da web;
- `<!DOCTYPE>` com entidades;
- arquivo acima de 2 MB.

Evite:

- **Texto (`<text>`)**: dentro de `<img>` a fonte do site não carrega e cada
  visitante vê a fonte do próprio sistema. Se uma palavra for indispensável
  (um rótulo de diagrama, o nome no `og`), desenhe as letras com formas
  geométricas simples ou converta o texto em contorno. O portfólio aceita
  `<text>`, mas avisa.
- Imagem raster embutida. Se for indispensável (um print), use
  `data:image/png;base64,...` ou `data:image/jpeg;base64,...` e mantenha o
  arquivo abaixo de 400 kB.
- Filtros pesados (`feGaussianBlur` grande, várias sombras): deixam a rolagem
  lenta no celular. Prefira gradientes.
- Milhares de nós: simplifique caminhos; acima de 400 kB o portfólio avisa.

## `pack.json`

```json
{ "projeto": "yolocraft", "titulo": "YOLOcraft", "versao": 1, "notas": "Direção 2: esquema da rede" }
```

`projeto` é o código no portfólio. A ferramenta recusa aplicar o pacote a um
projeto com outro código — protege contra o `.zip` errado. Sem saber o código,
deixe o campo de fora.

## Checklist antes de entregar

- [ ] `card-light.svg` existe; nomes exatamente como na tabela.
- [ ] Cada arquivo com o `viewBox` da tabela e `width`/`height` iguais.
- [ ] Fundo cheio em todos; versões escuras com fundo escuro de verdade.
- [ ] Claro e escuro de cada quadro com a mesma composição.
- [ ] Topo da página: nada importante nos 20% de baixo.
- [ ] Prévia: o essencial entre x = 285 e 915.
- [ ] Sem `<script>`, eventos, `foreignObject`, links ou fontes de fora.
- [ ] Sem texto, ou texto desenhado como forma.
- [ ] Cada SVG abaixo de 400 kB.
- [ ] Prancha revisada nos dois temas.
- [ ] `pack.json` com o código do projeto, se eu tiver dito.
