# Modelo de post de projeto

A estrutura dos projetos já publicados vale mais que este modelo: leia 1–2
deles com `get_project` e siga as mesmas seções e o mesmo tom. Use o modelo
abaixo quando não houver referência melhor.

## Resumo (`description`)

Uma ou duas frases: o que é e para que serve. Sem jargão desnecessário.

> Detector de objetos em imagens com arquitetura YOLO, treinado para
> identificar componentes eletrônicos em bancadas de laboratório.

## Corpo da página (`detailedDescription`)

Seções sugeridas, em PT e com os títulos equivalentes em EN no
`detailedDescriptionEn`:

| PT | EN | Conteúdo |
| --- | --- | --- |
| `## Contexto` | `## Context` | Problema ou motivação; onde o projeto se encaixa |
| `## Objetivo` | `## Goal` | O que se quis alcançar, em 2–4 linhas |
| `## O que foi feito` | `## What I built` | Abordagem, etapas, decisões importantes |
| `## Como funciona` | `## How it works` | Arquitetura, fluxo de dados, um diagrama se houver |
| `## Resultados` | `## Results` | Números e figuras **do repositório**, com legendas |
| `## Próximos passos` | `## Next steps` | O que falta, ideias de continuação |

Omita a seção que não tiver conteúdo real. Projeto em planejamento costuma ter
só Contexto, Objetivo e Próximos passos.

### Fluxogramas

Fluxo de etapas vai num bloco ` ```fluxo `, que o site desenha como cartões
numerados ligados por setas (não use ASCII alinhado a espaço num bloco de
código comum):

````
```fluxo
Tema aleatório e desconhecido
↓
Pesquisa livre (tempo limitado) | O sistema monta, em segredo, a rubrica
↓ quando o tempo acaba
Relatório com feedback
```
````

- `↓` sozinho na linha liga dois passos; texto depois da seta vira rótulo.
- `|` separa o passo de uma nota ao lado; linha começando com `|` continua a nota.
- Um parêntese no fim do passo vira o detalhe, em letra menor.
- No `detailedDescriptionEn`, o mesmo bloco traduzido (continua ` ```fluxo `).

Referências não entram no corpo: vão no campo `references`, que o site mostra
numa seção própria.

## Tom

- Português claro, frases curtas, técnico sem enfeite.
- Primeira pessoa quando falar do que eu fiz ("implementei", "treinei"), como
  nos outros projetos.
- Inglês natural no `En`, não tradução literal.
- Números sempre com a fonte no repositório (README, relatório, notebook).

## Destaques (`highlights`)

3 a 5 itens curtos, cada um um fato concreto:

- "Pipeline de aquisição em Python com PyVISA para 4 instrumentos"
- "mAP@0,5 de 0,72 no conjunto de teste" (só se estiver no repositório)

## Legendas de imagens

Dizem o que a imagem mostra, não o que é óbvio:

- PT: "Curva precisão × revocação no conjunto de teste"
- EN: "Precision–recall curve on the test set"

## Notas de gravação (`note`)

Curtas e específicas, com a origem quando houver:

- "Acrescenta resultados do treino v3 a partir do README"
- "Troca a capa pelo print da interface nova"
- "Cria o post a partir do repositório (rascunho)"
