# Retomada técnica

## Terceira etapa — experiência de uso

- Busca, categoria e ordenação de projetos persistem na URL. Voltar à lista a partir do projeto preserva os filtros.
- Galeria em diálogo nativo: zoom, setas, deslize horizontal, Escape e retorno do foco. Legendas opcionais PT/EN editáveis no formulário existente, sem alterar os conteúdos atuais.
- Sumário existente reaproveitado no celular com expansão, cópia de links de seção e correção de âncoras durante carregamento do Markdown.
- Menu móvel com contenção de foco, Escape e bloqueio de rolagem; foco visível, campos maiores no celular e respeito à preferência de movimento reduzido.
- Imagens com placeholder neutro e proteção contra respostas atrasadas; removida a imagem externa genérica que aparecia em falhas. Galeria reserva proporção antes do carregamento.
- Rotas e exportação PDF carregadas sob demanda. Bundle principal reduziu de aproximadamente 948 kB para 763 kB (antes de gzip); ainda existem chunks grandes, especialmente Markdown.
- Correções direcionadas de dependências: auditorias completa e de produção sem vulnerabilidades reportadas nesta execução. Vitest atualizado para 4.1.11 e override de qs no Express.
- Leitura offline usa imediatamente os dados locais; leitura online tem timeout de 15 segundos e preserva bloqueio de gravação caso falhe.
- Testes adicionados para filtros, galeria, navegação móvel, rascunhos, falhas de imagens, concorrência e cache offline. Comandos: `npm test`, `npm run test:e2e`, `npm run build`, `npm run test:production`.
- Resultado final: 77 testes unitários, 9 E2E de desenvolvimento e 2 E2E de produção local passaram; TypeScript e build passaram. Cache offline de páginas filtradas e exclusão de páginas administrativas verificados. Auditoria completa: zero vulnerabilidades reportadas.
- Sem deploy ou migração remota. Testes locais não substituem validação na hospedagem nem garantem conformidade completa de acessibilidade em todos os dispositivos.

## Segunda etapa

- Painel duplicado “Histórico e recuperação” removido da interface a pedido do usuário; ferramentas administrativas existentes preservadas.
- Cabeçalhos de segurança adicionados no Express e na configuração Vercel; publicação ainda não executada.
- Salvamentos da mesma aba serializados para evitar sobreposição; conflitos entre abas continuam bloqueando a escrita.
- Metadados sociais, canonical e JSON-LD sincronizados durante navegação SPA.
- Backup administrativo carregado sob demanda; bundle do servidor movido para `.server/`, fora da pasta pública `dist/`.
- Testes unitários adicionais e suíte E2E inicial adicionados. Validações de produção e serviços externos continuam pendentes.
- Validação desta etapa: 73 testes unitários e 3 E2E passaram, além de TypeScript e build. O E2E usa respostas simuladas, sem acessar dados reais do Supabase.
- `npm audit --omit=dev` ainda reporta 7 alertas (5 moderados, 2 altos); correções de dependências ficaram para uma etapa dedicada.
- Use `npm start` após o build para o servidor de produção local; `npm run dev` mantém o modo fictício disponível.

Implementação interrompida a pedido do usuário para revisão local antes do commit. Nenhum deploy, commit ou migração remota foi executado.

## Implementado nesta etapa

- Validação e normalização de dados com Zod; importações e backups validados.
- Isolamento adicional do modo local `/?dev`, com cache separado e bloqueio de escritas remotas.
- Histórico local, exportação/importação e comparação por seção no painel de recuperação.
- Recuperação de rascunhos dos editores de projetos e artigos.
- Tradução autenticada com lista de administradores e limitação de requisições.
- Endpoint de imagens responsivas WebP com fallback à imagem original.
- Infraestrutura opcional de monitoramento e analytics, sem contas configuradas.
- Manifesto, service worker de produção e indicação de offline/atualização.
- Pré-renderização com dados públicos do Supabase e sanitização do HTML.

## Configuração externa ainda necessária

- Revisar e executar manualmente `supabase/technical-upgrade.sql` para histórico e validação no banco. A migração NÃO foi aplicada.
- Tradução: configurar `ADMIN_USER_IDS`, `GEMINI_API_KEY` e Supabase no servidor. Em produção também requer `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`; sem configuração falha de forma fechada.
- Monitoramento opcional: `VITE_SENTRY_DSN`.
- Analytics opcional: `VITE_UMAMI_SCRIPT_URL` (HTTPS) e `VITE_UMAMI_WEBSITE_ID`.
- SEO: configurar `VITE_SITE_URL`. O build usa o Supabase; `PRERENDER_SOURCE=template` é apenas uma alternativa explícita para dados de exemplo.

## Pendências registradas na primeira etapa (atualizações acima)

- Testes E2E e testes dedicados às funcionalidades novas (Playwright instalado, suíte ainda não criada).
- Cabeçalhos HTTP de segurança e validação em hospedagem real.
- Revisão dos metadados durante navegação SPA e separação adicional público/admin/serviços.
- Revisão de concorrência entre salvamentos, conflitos e recuperação de rascunhos com testes de ponta a ponta.
- Validar PWA, atualização/offline, otimização de imagens, tradução e serviços externos em produção.
- Investigar alertas de dependências sem atualizações automáticas indiscriminadas.

## Revisão local

`npm run dev` inicia em http://localhost:3000/. Use `/?dev` para o ambiente fictício local. Service worker só é registrado no build de produção. O trabalho não corresponde à conclusão de todos os itens originalmente sugeridos.
