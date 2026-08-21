import { describe, expect, it } from "vitest";

/**
 * Fumaça de módulo: cada peça recém-separada precisa ao menos carregar.
 *
 * As abas do painel e as três seções do currículo saíram de arquivos grandes;
 * um `import` esquecido no caminho não aparece no TypeScript quando o nome
 * existe em outro escopo, mas quebra na hora de abrir a tela. Carregar o
 * módulo aqui pega isso sem precisar montar a interface inteira.
 */
const modulos = {
  BackupsTab: () => import("../admin/BackupsTab"),
  SecurityTab: () => import("../admin/SecurityTab"),
  MediaTab: () => import("../admin/MediaTab"),
  TranslationTab: () => import("../admin/TranslationTab"),
  AdvancedTab: () => import("../admin/AdvancedTab"),
  AdminManagementModal: () => import("../AdminManagementModal"),
  FormacaoCard: () => import("../FormacaoCard"),
  ExperienciasCard: () => import("../ExperienciasCard"),
  AtividadesCard: () => import("../AtividadesCard"),
  ProjetosRelacionados: () => import("../ProjetosRelacionados"),
  ExperienceEducationSection: () => import("../ExperienceEducationSection"),
};

describe("módulos separados carregam e exportam um componente", () => {
  for (const [nome, carregar] of Object.entries(modulos)) {
    it(nome, async () => {
      const modulo = await carregar();
      expect(typeof modulo.default).toBe("function");
    });
  }
});
