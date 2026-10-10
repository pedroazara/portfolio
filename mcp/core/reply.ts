/** Resultado de ferramenta em JSON legível — o formato que a IA lê melhor. */
export function reply(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}
