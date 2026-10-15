---
name: portfolio-capas
description: "Desenha o pacote de capas de um projeto do meu portfólio: SVGs para cada lugar do site (cartão, celular, topo, quadrado, prévia do link), em tema claro e escuro, num .zip."
---

# Pacote de capas para o portfólio

Cada projeto do meu site aparece em quadros diferentes: o cartão da lista, o
cartão no celular, o topo da página do projeto (com o painel do título por
cima da parte de baixo), miniaturas e a prévia quando alguém compartilha o
link. E o site tem tema claro e escuro. Uma imagem só nunca fica boa em todos.

Esta skill desenha **uma arte para cada quadro, nos dois temas**, em SVG, e
entrega tudo num `.zip` que eu aplico no site com `/portfolio`.

Antes de desenhar, leia:

- `references/especificacao.md` — os arquivos, medidas, áreas seguras e as
  regras técnicas dos SVGs (o site **recusa** o pacote que não segue);
- `references/identidade-visual.md` — paleta clara e escura, estilo e como
  passar uma arte do claro para o escuro.

A prancha de revisão está em `assets/prancha.html`.

## 1. Entenda o projeto

Preciso de pouco, mas preciso:

- título e código do projeto no portfólio (o trecho do link,
  `/projetos/<codigo>`); se eu não souber o código, siga sem ele;
- o que o projeto é, em uma frase;
- **o elemento visual central**: o dispositivo, o diagrama, o gráfico, o
  fenômeno físico, a interface. É ele que vira a capa;
- referências que eu mandar (prints, fotos, o README, o post atual).

Se faltar o elemento central, proponha dois ou três a partir do que o projeto
faz, em vez de perguntar no vazio.

## 2. Proponha direções

Mostre 2 ou 3 direções, cada uma com uma frase e um esboço do **cartão claro**
(1600×900). Varie a ideia, não só a cor: um esquema técnico, um close no
objeto, uma abstração dos dados. Espere eu escolher.

## 3. Desenhe o cartão claro primeiro

`card-light.svg` é a base: é o único obrigatório e é dele que saem os outros.
Desenhe, mostre e ajuste até eu aprovar. O cartão é visto pequeno (de 320 a
560 px de largura): formas grandes, poucos elementos, contraste claro.

## 4. Derive o resto do pacote

A partir do cartão aprovado, **recomponha** — não recorte nem estique — para
cada quadro, seguindo as áreas seguras de `references/especificacao.md`:

1. `card-dark.svg` — mesma composição, paleta escura;
2. `hero-light.svg` / `hero-dark.svg` — versão mais rica, para tela grande,
   com os 20% de baixo só com fundo;
3. `card-mobile-light.svg` / `card-mobile-dark.svg` — 4:3, o objeto maior;
4. `og.svg` — prévia do link, só clara, com o essencial no quadrado central;
5. `square-light.svg` / `square-dark.svg` — um símbolo que se lê a 73 px
   (opcional; faça se eu pedir ou se o projeto tiver um ícone forte).

A versão escura de cada quadro mantém **as mesmas posições** da clara: trocar
de tema não pode fazer a imagem "pular".

## 5. Monte a prancha de revisão

Copie `assets/prancha.html` para junto dos SVGs. Ela mostra cada arquivo no
quadro em que vai aparecer, nos dois temas, com o painel do título por cima do
topo e o recorte do WhatsApp na prévia. Se o ambiente não servir os arquivos
vizinhos, cole os SVGs direto no HTML. Revise comigo por ela, não por arquivos
soltos.

## 6. Confira antes de entregar

Passe pelo checklist do fim de `references/especificacao.md`. O portfólio
recusa o pacote com nome errado, proporção errada, `<script>`, atributos de
evento, `foreignObject` ou qualquer coisa carregada de fora.

## 7. Entregue

Um `.zip` chamado `<codigo>-capas.zip` com os SVGs, o `pack.json` e a prancha.
Termine dizendo, numa linha, como aplicar:

> No Claude Code do computador onde o portfólio está configurado:
> `/portfolio aplica as capas de <caminho do .zip>`

Se o ambiente não gerar `.zip` nem SVG para baixar, entregue PNGs com os
mesmos nomes (`card-light.png`...) no dobro das medidas da tabela; o portfólio
também aceita, mas SVG fica nítido em qualquer tela e pesa menos.
