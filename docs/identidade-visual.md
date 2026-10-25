# Identidade visual do site

Referência única do design gráfico do site (pedroazara.vercel.app): cores, fontes,
marca, motivos gráficos, formas e movimento. Serve para criar peças fora do
site, como as animações do vídeo de pitch, com a mesma cara do site.

Os valores vêm do código. Quando algo mudar no site, a fonte da verdade é:

| Assunto | Arquivo |
| --- | --- |
| Cores, fontes, animações globais | `src/index.css` |
| Logo (Órbita) | `src/components/OrbitaIcon.tsx`, `public/favicon.svg` |
| Assinatura do cabeçalho | `src/components/PortfolioBrand.tsx` |
| Traço de sinal (onda da home) | `src/lib/pulso.ts`, `src/components/SinalPulso.tsx` |
| Abertura da home | `src/components/ResumeHeader.tsx` |
| Imagem de compartilhamento | `scripts/og-image.ts` → `public/og-home.jpg` |
| Slides do elevator pitch | `src/components/PitchSlideCanvas.tsx`, `Pitch*Slide.tsx` |
| Cartões e moldura das seções | `src/lib/cardStyle.ts` |
| Capas de projeto | `src/lib/coverPack.ts`, `mcp/skills/portfolio-capas/` |
| Blog | `src/components/BlogHeader.tsx`, `BlogSection.tsx`, `src/pages/PostPage.tsx` |

---

## 1. Essência

- **Técnico e sóbrio.** É o site de um estudante de Engenharia Física: o visual
  lembra instrumento de laboratório, não agência de publicidade.
- **Um acento só: violeta.** Todo o resto é neutro levemente lavanda. O violeta
  marca o que importa: um botão, um traço, um item ativo.
- **A física como ornamento.** Os dois motivos gráficos vêm da física: um
  **átomo/órbita** (o logo) e um **pacote de onda num eixo de osciloscópio**
  (o traço da home). Não há ilustração genérica.
- **Muito respiro.** Títulos grandes, pouco texto por vez, bastante espaço
  vazio. Um elemento principal por tela.
- **Movimento como de instrumento.** As animações lembram aquisição de sinal:
  uma varredura que desenha o traço, um elétron que orbita, um pulso que segue o
  cursor. São suaves e sem exagero, e respeitam quem prefere menos movimento.

**Evitar:** gradiente arco-íris, neon, brilho, sombra pesada, 3D brilhante,
clip-art, foto de banco de imagens, muitas cores ao mesmo tempo, texto
centralizado em bloco longo.

---

## 2. Marca

### 2.1 Logo: a Órbita

Um átomo estilizado: **uma elipse inclinada a −30°**, **um elétron** percorrendo
a elipse e **um núcleo** no centro. Traço uniforme, pontas arredondadas.

Geometria (caixa de 48 × 48):

| Peça | Medida |
| --- | --- |
| Elipse (órbita) | centro (24, 24), raios 13 × 6, girada −30° |
| Traço | 2,2 px, `stroke-linecap: round` |
| Elétron | círculo de raio 2,2, preenchido |
| Núcleo | círculo de raio 3,5, preenchido |

Animação:

- O **elétron** dá uma volta completa na órbita a cada **3,5 s**, em loop.
- O **núcleo pulsa** de raio 3,5 para 2,6 e volta, também em **3,5 s**, `ease-in-out`.
- **No hover** (passar o mouse): aparece uma **segunda órbita** maior (raios
  20 × 9,23), o elétron **salta** para ela (escala 1,538, curva
  `cubic-bezier(.34, 1.56, .64, 1)` em 450 ms, um leve "estouro") e o núcleo
  cresce 1,314×. É a ideia de um elétron excitado mudando de nível.
- Com movimento reduzido, o elétron fica parado.

Versão para usar em vídeo (selo violeta com a órbita branca, igual ao cabeçalho):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="480" height="480" fill="none">
  <circle cx="24" cy="24" r="24" fill="#7555d5"/>
  <g transform="translate(2.18 2.18) scale(0.909)">
    <g stroke="#ffffff" stroke-width="2.2" stroke-linecap="round">
      <g transform="rotate(-30 24 24)">
        <ellipse cx="24" cy="24" rx="13" ry="6"/>
        <circle r="2.2" fill="#ffffff" stroke="none">
          <animateMotion dur="3.5s" repeatCount="indefinite"
            path="M11 24 a13 6 0 1 0 26 0 a13 6 0 1 0 -26 0"/>
        </circle>
      </g>
    </g>
    <circle cx="24" cy="24" r="3.5" fill="#ffffff">
      <animate attributeName="r" values="3.5;2.6;3.5" dur="3.5s" repeatCount="indefinite"/>
    </circle>
  </g>
</svg>
```

### 2.2 Ícone do navegador (favicon)

`public/favicon.svg`: **quadrado de cantos arredondados** (raio 14 em 48) em
violeta `#7555d5`, com a órbita branca **maior** (raios 18 × 8, traço 2,5) para
ficar legível em 16 px. Mesma animação de elétron e núcleo.

### 2.3 Assinatura

No cabeçalho do site: **selo circular violeta (44 px) com a órbita branca** +
**"Pedro Ázara"** em Plus Jakarta Sans, negrito, 16 px, cor tinta.

No blog, a assinatura é só texto: **"Pedro Ázara"** em negrito + **" / blog"**
em cinza (tinta fraca).

Nome completo nas peças de apresentação: **Pedro Henrique Almeida** (na home e
no pitch) ou **Pedro Henrique Ázara de Almeida** (imagem de compartilhamento,
que puxa o nome publicado no perfil).

---

## 3. Cores

### 3.1 Papéis: tema claro

| Papel | Hex | Uso |
| --- | --- | --- |
| **Papel** | `#f7f8fc` | Fundo da página |
| **Superfície** | `#ffffff` | Cartões, cabeçalho |
| **Superfície alta** | `#f7f7fb` | Áreas internas, fundo de imagem |
| **Tinta** | `#252639` | Títulos e texto principal |
| **Tinta suave** | `#5e6178` | Texto de apoio, subtítulos |
| **Tinta fraca** | `#6d7087` | Rótulos, datas, ícones |
| **Borda suave** | `#eeedf5` | Divisões muito leves |
| **Borda** | `#e9eaf2` | Divisões, contorno de cartão |
| **Borda forte** | `#cfcedd` | Marcas do eixo, contornos de controle |
| **Acento** | `#7055d8` | Traço da onda, item ativo, destaques |
| **Acento sólido** | `#7555d5` | Botão principal (texto branco), selo do logo |
| **Acento forte / tinta** | `#6545c5` | Texto violeta sobre fundo claro, hover do botão |
| **Acento suave** | `#f0ecff` | Fundos tingidos, halos, placeholder de foto |

### 3.2 Papéis: tema escuro

| Papel | Hex | Uso |
| --- | --- | --- |
| **Papel** | `#0f121d` | Fundo da página |
| **Superfície** | `#171b2a` | Cartões (é também o fundo dos slides do pitch) |
| **Superfície alta** | `#1d2233` | Áreas internas |
| **Tinta** | `#edf0fb` | Títulos e texto principal |
| **Tinta suave** | `#cfcedd` | Texto de apoio |
| **Tinta fraca** | `#a0a6bf` | Rótulos, datas |
| **Borda** | `#2b3043` | Divisões |
| **Borda forte** | `#40445e` | Marcas do eixo, contornos |
| **Acento** | `#b6a2ff` | Traço da onda, destaques (violeta mais claro) |
| **Acento forte** | `#cbbaff` | Brilho no acento |
| **Acento sólido** | `#7555d5` | Botão principal (igual ao claro) |
| **Acento suave** | `#2c2646` | Fundos tingidos |

**Do claro para o escuro não se inverte a cor:** troca-se cada papel pelo
equivalente da tabela. A composição e as posições continuam as mesmas.

### 3.3 Escalas completas

Violeta (o "indigo" do site, ajustado para violeta):

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#f0ecff` | `#e7dffc` | `#d5c8f6` | `#c5b3f4` | `#b6a2ff` | `#8060d4` | `#7555d5` | `#6545c5` | `#51399a` | `#3d2e6a` | `#26203e` |

Neutros lavanda (o "slate" do site):

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#f7f8fc` | `#f0f0f7` | `#e4e3ee` | `#cfcedd` | `#a0a6bf` | `#6d7087` | `#5e6178` | `#40445e` | `#2b3043` | `#171b2a` | `#0f121d` |

### 3.4 Cores de apoio (com parcimônia)

Só quando o conteúdo pede várias cores ao mesmo tempo, como as categorias de
habilidades no currículo ou duas séries num gráfico. A ordem de uso é esta:

violeta `var(--acento)` → céu `#0ea5e9` → esmeralda `#10b981` → âmbar `#f59e0b`
→ violeta claro `#8b5cf6` → rosa `#f43f5e` → verde-azulado `#0d9488` → fúcsia `#d946ef`.

Estados: sucesso em esmeralda (`#059669`), aviso/rascunho em âmbar
(`#fef3c7` fundo, `#92400e` texto), erro em rosa (`#e11d48`).

### 3.5 Variáveis prontas (CSS)

```css
:root {
  --papel: #f7f8fc; --superficie: #ffffff; --superficie-alta: #f7f7fb;
  --tinta: #252639; --tinta-suave: #5e6178; --tinta-fraca: #6d7087;
  --borda-suave: #eeedf5; --borda: #e9eaf2; --borda-forte: #cfcedd;
  --acento: #7055d8; --acento-solido: #7555d5; --acento-tinta: #6545c5; --acento-suave: #f0ecff;
}
.escuro {
  --papel: #0f121d; --superficie: #171b2a; --superficie-alta: #1d2233;
  --tinta: #edf0fb; --tinta-suave: #cfcedd; --tinta-fraca: #a0a6bf;
  --borda-suave: #2b3043; --borda: #2b3043; --borda-forte: #40445e;
  --acento: #b6a2ff; --acento-solido: #7555d5; --acento-tinta: #b6a2ff; --acento-suave: #2c2646;
}
```

---

## 4. Tipografia

Todas do Google Fonts.

| Fonte | Papel | Como aparece |
| --- | --- | --- |
| **Plus Jakarta Sans** | Títulos, nome, marca | Pesos 700–800 (até 900 no pitch). Letras juntas (`letter-spacing` negativo), linhas apertadas. |
| **Inter** | Texto corrido, interface | Pesos 400–600. Tom neutro. |
| **JetBrains Mono** | Rótulos técnicos, numeração, contadores | Pequena, às vezes MAIÚSCULA com letras bem espaçadas. |
| **Source Serif 4** | Blog (títulos e texto dos artigos) | 400–700 e itálico. Só no blog. |

Receitas:

- **Nome na abertura da home:** Plus Jakarta Sans 800, tamanho entre 2,6 rem e
  5,75 rem (cresce com a tela), `line-height: 0.92`, `letter-spacing: -0.035em`.
  Bem grande, quase um logotipo.
- **Subtítulo da abertura:** Inter 18–20 px, tinta suave, cada parte do título em
  uma linha ("Estudante de Engenharia Física" / "Física Computacional,
  Instrumentação & IA").
- **Título de seção:** Plus Jakarta Sans 800, 24–30 px, `tracking-tight`.
- **Rótulo/"eyebrow":** JetBrains Mono 12 px, negrito, MAIÚSCULAS,
  `letter-spacing: 0.3em` (ex.: `S O B R E  M I M` no pitch).
- **Numeração:** JetBrains Mono com dois dígitos, `01`, `02`, `03`; contador de
  slide `01 / 04` com números de largura fixa.
- **Texto corrido:** Inter 16–18 px, entrelinha folgada (`1.6`–`1.75`).

---

## 5. Motivo gráfico: o traço de sinal

É a assinatura visual do site. Fica logo abaixo do nome na home, ocupando a
largura toda da tela, e se repete na imagem de compartilhamento.

**O que é:** um **pacote de onda**, uma onda (portadora) dentro de um envelope
gaussiano, sobre uma **linha de base graduada como a tela de um osciloscópio**.
Lembra um pulso de laser ultracurto ou um surto de vibração num sensor.

Elementos:

| Elemento | Estilo |
| --- | --- |
| **Linha de base** | É a própria portadora: fora do pacote ela é uma linha reta. |
| **Marcas do eixo** | Riscos verticais a cada **16 px**; a cada 5, um risco maior (meia-altura 6 px contra 3 px). Cor borda forte, 1 px. |
| **Portadora (onda)** | Acento, traço **1,75 px** (2,5 px na imagem de compartilhamento), cantos e pontas arredondados. |
| **Envelope** | Duas curvas (em cima e embaixo) contornando o pacote: acento com **40% de opacidade**, 1 px, **tracejado `2 4`**. |
| **Posição em repouso** | Pacote centrado a **70% da largura** (à direita). Altura da faixa 120 px. |

Matemática (`src/lib/pulso.ts`), para reproduzir em qualquer ferramenta:

```js
// largura L, altura H, centro do pacote c (em px)
const meio = H / 2;
const amplitude = H * 0.4;
const sigma  = clamp(L * 0.05, 26, 64);   // largura do envelope
const lambda = clamp(L * 0.018, 11, 22);  // comprimento de onda
const envelope = x => Math.exp(-((x - c) ** 2) / (2 * sigma ** 2));
// a fase anda 0,6 vez a velocidade do grupo: as franjas "escorregam" dentro do pacote
const y = x => meio - amplitude * envelope(x) * Math.cos(2 * Math.PI * (x - 0.6 * c) / lambda);
// envelope desenhado só entre c - 3,5σ e c + 3,5σ: meio ± amplitude·envelope(x)
```

Animação na home:

1. **Varredura:** ao abrir a página, a onda é **desenhada da esquerda para a
   direita** como a aquisição de um osciloscópio, em **1,4 s**, curva
   `cubic-bezier(0.65, 0, 0.35, 1)`, começando após 150 ms.
2. **Envelope:** as linhas tracejadas **aparecem em fade** depois (500 ms, a partir
   de 1,1 s).
3. **Interação:** quando o cursor passa pela abertura, o pacote **desliza até
   ele** (suavização de 12% da distância por quadro, no máximo 22 px por quadro).
   Ao sair, ele fica onde parou. Como a fase anda mais devagar que o grupo, as
   franjas parecem correr por dentro do pacote enquanto ele se move.

Para vídeo, é o elemento mais forte: **abrir com a varredura desenhando a onda**,
ou mover o pacote de um lado a outro para marcar a passagem entre cenas.

---

## 6. Formas, superfícies e detalhes

- **Cantos:** 4 px (retrato do pitch), 8 px (botões pequenos, slides do pitch), **12 px** (botões e campos,
  o mais comum), 16 px (cartões, retrato da home), **24 px** (cartões de seção do
  currículo). A foto na imagem de compartilhamento tem 28 px.
- **Bordas:** sempre finas, 1 px, nas cores de borda. Nada de contorno grosso.
- **Sombras:** quase nenhuma. No máximo uma sombra bem difusa e fraca no hover
  dos cartões (`0 8px 24px -16px`, tinta a 25%).
- **Fio de luz:** os cartões de seção têm, na aresta de cima, uma linha de 1 px
  em degradê **transparente → violeta 40% → transparente**.
- **Halo:** no canto superior direito dos cartões há um círculo violeta muito
  desfocado (5% de opacidade no claro, 10% no escuro), que dá profundidade sem
  chamar atenção.
- **Retrato:** quadrado de cantos arredondados (16 px), com contorno de 1 px na
  cor de borda. Sem foto, mostra a inicial "P" em violeta sobre acento suave.
- **Botão principal:** fundo `#7555d5`, texto branco em negrito, cantos 12 px,
  ícone à esquerda. **Botão secundário:** fundo claro, borda 1 px, texto tinta.
- **Item ativo no menu:** barrinha de **3 px**, arredondada, em violeta, embaixo
  do texto. Ela desliza até o item clicado.
- **Ícones:** biblioteca Lucide, traço fino, 16 px, cor tinta fraca.

---

## 7. Movimento

| Movimento | Valores |
| --- | --- |
| **Entrada de página** | Sobe 10 px e aparece: 380 ms, `cubic-bezier(0.22, 1, 0.36, 1)` (desacelera bem no fim). |
| **Molas** (barrinha do menu, seletor de idioma) | rigidez 360, amortecimento 32, massa 0,8: rápida, sem quicar. |
| **Hover de cartão** | Sobe 3 px, borda escurece, sombra leve: 180 ms. Seta do "ler" anda 2 px na diagonal. |
| **Logo** | Elétron em 3,5 s; núcleo pulsa em 3,5 s; salto de nível com leve "estouro" (450 ms). |
| **Traço de sinal** | Varredura 1,4 s + envelope em fade (seção 5). |
| **Barra de progresso** | Fina, no topo, preenchendo da esquerda para a direita: 3 px em violeta na leitura do blog, 4 px em `#40445e` no pitch. |

Princípios para as animações do vídeo:

- **Curvas que desaceleram** (`ease-out` forte). Nada de quique exagerado; o
  único "estouro" permitido é o salto do elétron.
- **Durações curtas** para interface (150–400 ms) e **longas e calmas** para
  ornamento (1,4 s de varredura, ciclos de 3,5 s).
- **Um elemento se mexe por vez.** O resto da tela fica parado.
- **Entradas de texto** subindo 10 px com fade, em sequência (uma linha depois
  da outra), como os tópicos que aparecem cumulativamente no pitch.

---

## 8. Peças existentes

### 8.1 Abertura da home

Fundo papel. À esquerda, o **nome enorme** em Plus Jakarta Sans 800; abaixo, o
subtítulo em duas linhas (tinta suave). À direita, alinhado à base do nome, o
**retrato** quadrado (até 192 px). Logo abaixo, o **traço de sinal** de ponta a
ponta da tela. Depois, a bio em Inter à esquerda e, à direita, separados por uma
linha vertical fina, os contatos, os links e os botões "Baixar currículo (PDF)"
(violeta) e "Ver os projetos" (contorno).

### 8.2 Imagem de compartilhamento (`public/og-home.jpg`, 1200 × 630)

É a prévia que aparece no WhatsApp, LinkedIn e Discord. É gerada por `npm run og`.

- Fundo claro.
- Nome em Plus Jakarta Sans 800, 80 px, entrelinha 0,92, `letter-spacing: -0.035em`,
  margem de 80 px à esquerda e 64 px no topo.
- Subtítulo em Inter 28 px, uma parte por linha.
- Foto 220 × 220 à direita, cantos de 28 px.
- Traço de sinal ocupando a largura toda, a 392 px do topo, com 150 px de
  altura e o pacote a 70% da largura.
- Endereço do site embaixo à esquerda (Inter 24 px, cinza).

> **Atenção:** esta imagem ainda usa os tons da paleta antiga (violeta
> `#4f46e5`, títulos `#0f172a`, texto `#475569`). As peças novas devem seguir a
> paleta da seção 3; ao gerar a imagem de novo, vale alinhar.

### 8.3 Elevator pitch (`/elevator-pitch`)

Apresentação em slides para a candidatura ao estágio no CNPEM.

- **Slide:** fundo escuro `#171b2a`, cantos de 8 px, texto branco, sobre uma
  página `#f0f0f7`.
- **Cabeçalho do slide:** logo da **UFLA** à esquerda e do **CNPEM** à direita,
  ambos brancos (`public/brand/`), com uma linha branca a 15% embaixo.
- **Título:** Plus Jakarta Sans 700, cerca de 42 px.
- **Rótulo:** JetBrains Mono MAIÚSCULO, espaçado, branco a 70%.
- **Listas numeradas:** `01`, `02`, `03` em JetBrains Mono cinza + texto em Inter
  branco, cada item com uma linha branca a 15% embaixo.
- **Rodapé:** contador `01 / 04` à direita, mono, cinza, letras espaçadas.
- **Progresso:** barra de 4 px no topo da tela, cinza-azulado (`#40445e`).
- Retrato quadrado com cantos quase retos (4 px) e contorno branco a 20%.

Para o vídeo, este é o **modo escuro de apresentação**: fundo `#171b2a`, texto
branco, rótulos em mono, linhas divisórias brancas a 15% e o violeta claro
`#b6a2ff` como acento.

### 8.4 Capas de projeto

Ilustração vetorial limpa e técnica (esquemas, instrumentos, circuitos, ondas,
pontos de dados), com um elemento principal, violeta como acento e fundo
próximo do papel. Formatos: cartão 1600 × 900 (16:9), cartão no celular
1200 × 900 (4:3), topo da página 1600 × 900, quadrado 1200 × 1200, prévia de
link 1200 × 630 (JPEG até 300 kB), em versão clara e escura. Detalhes em
`mcp/skills/portfolio-capas/references/`.

### 8.5 Blog (`/blog`)

Tem visual próprio de publicação, mais calmo que o resto do site:

- Cabeçalho mínimo: "Pedro Ázara / blog" à esquerda; "Sobre mim ↗", idioma e
  tema à direita. Sem o menu do portfólio.
- Coluna de leitura de **42 rem (~670 px)**, centralizada.
- Títulos e texto dos artigos em **Source Serif 4**; rótulos, datas e interface
  em Inter.
- Lista de artigos como índice: data · assunto, título em serifa, resumo, tempo
  de leitura e uma capa pequena ao lado. Filtros de assunto são links de texto
  sublinhados em violeta.

---

## 9. Guia rápido para as animações do pitch

**Formato:** 1920 × 1080 (16:9). Margem de segurança de ~96 px nas laterais e
~64 px em cima e embaixo, a mesma proporção das margens da imagem de
compartilhamento.

**Dois fundos possíveis, escolha um por vídeo:**

| | Claro (como o site) | Escuro (como o pitch) |
| --- | --- | --- |
| Fundo | `#f7f8fc` | `#171b2a` (ou `#0f121d` para mais profundidade) |
| Texto principal | `#252639` | `#ffffff` / `#edf0fb` |
| Texto de apoio | `#5e6178` | `#cfcedd` |
| Linhas e marcas | `#cfcedd` | branco a 15% / `#40445e` |
| Acento | `#7055d8` | `#b6a2ff` |

**Vocabulário de cena:**

1. **Abertura:** o traço de sinal **varrendo** a tela da esquerda para a
   direita (1,4 s), o envelope aparecendo em seguida e o nome entrando por cima
   em Plus Jakarta Sans 800.
2. **Marca:** o selo da Órbita com o elétron girando (3,5 s por volta). Para
   transição, o elétron pode "saltar de nível" como no hover.
3. **Títulos de cena:** rótulo em JetBrains Mono MAIÚSCULO espaçado
   (`S O B R E  M I M`) + título em Plus Jakarta Sans 700–800.
4. **Listas:** itens numerados `01`, `02`, `03` entrando um por vez (sobe 10 px +
   fade, ~380 ms cada), separados por linhas finas.
5. **Transições:** deslocar o pacote de onda de um lado da tela ao outro, ou
   corte seco com entrada de página (sobe 10 px, 380 ms). Nada de wipes
   coloridos ou zooms rápidos.
6. **Destaques:** pintar uma palavra ou um número com o acento violeta, nunca
   várias ao mesmo tempo.
7. **Encerramento:** nome + endereço do site (`pedroazara.vercel.app`) + QR code
   (o pitch já tem um em `PitchSiteQr`), sobre o traço de sinal em repouso a
   70% da largura.

**Não fazer:** fundo com várias cores, degradês fortes, sombras pesadas, texto
com contorno ou brilho, fontes fora das quatro da seção 4, animação simultânea
de muitos elementos.

---

## 10. Inconsistências conhecidas

Detalhes que divergem hoje e convém lembrar ao criar peças novas:

- **Imagem de compartilhamento** usa a paleta antiga (seção 8.2).
- **Favicon** tem a órbita maior (18 × 8) que o logo do cabeçalho (13 × 6), de
  propósito, pela legibilidade em tamanho pequeno.
- **Slides do pitch** usam o cinza-escuro fixo (`#171b2a`) em vez dos tokens de
  tema, porque são sempre escuros, mesmo com o site no tema claro.
