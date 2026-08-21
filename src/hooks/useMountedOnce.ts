import { useEffect, useState } from "react";

/**
 * Continua verdadeiro depois que `ativo` for verdadeiro pela primeira vez.
 *
 * Serve para montar sob demanda o que é caro e raro — os modais do painel,
 * carregados com `React.lazy`. Montar só quando abre é o que mantém esse
 * código fora do pacote inicial; continuar montado depois de fechar preserva
 * a animação de saída e evita baixar o mesmo pedaço de novo na segunda vez.
 */
export function useMountedOnce(ativo: boolean): boolean {
  const [jaAbriu, setJaAbriu] = useState(ativo);

  useEffect(() => {
    if (ativo) setJaAbriu(true);
  }, [ativo]);

  return jaAbriu || ativo;
}
