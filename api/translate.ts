// A extensão `.js` é obrigatória: com "type": "module", a Vercel roda a função
// como ESM no Node, que não resolve import relativo sem extensão — sem ela, a
// função cai ao carregar (FUNCTION_INVOCATION_FAILED) antes de responder.
export { default } from "../server/translate.js";
