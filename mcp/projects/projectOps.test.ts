import { describe, expect, it } from "vitest";
import type { Project, ProjectCategory } from "../../src/types";
import {
  applyProjectChanges,
  buildNewProject,
  editText,
  findProject,
  findProjectByRepo,
  normalizeRepoUrl,
  summarizeProject,
} from "./projectOps";

const categories: ProjectCategory[] = [
  { id: "software", name: "Software" },
  { id: "instrumentacao", name: "Instrumentação" },
];

const yolo: Project = {
  id: "proj-yolocraft",
  codigo: "yolocraft",
  title: "YOLOcraft",
  description: "Detecção de objetos.",
  categoryId: "software",
  categoryIds: ["software"],
  tags: ["Visão Computacional"],
  githubUrl: "https://github.com/pedroazara/yolocraft",
  detailedDescription: "## Resultados\n\nmAP de 0,61.\n\n## Próximos passos\n\nTreinar mais.",
};
const bench: Project = { id: "proj-bench", codigo: "bancada", title: "Bancada", description: "", categoryId: "instrumentacao", tags: [] };

describe("busca de projetos", () => {
  it("acha pelo código, id ou código antigo", () => {
    const renamed = { ...yolo, codigo: "yolo", codigosAntigos: ["yolocraft"] };
    expect(findProject([renamed], "yolo")).toBe(renamed);
    expect(findProject([renamed], "proj-yolocraft")).toBe(renamed);
    expect(findProject([renamed], "yolocraft")).toBe(renamed);
  });

  it("sugere os códigos existentes quando não acha", () => {
    expect(() => findProject([yolo, bench], "nada")).toThrow(/yolocraft, bancada/);
  });

  it("reconhece o mesmo repositório em formatos diferentes", () => {
    for (const url of ["git@github.com:pedroazara/yolocraft.git", "https://www.github.com/PedroAzara/yolocraft/", "github.com/pedroazara/yolocraft"]) {
      expect(findProjectByRepo([bench, yolo], url)).toBe(yolo);
    }
    expect(normalizeRepoUrl("https://user@github.com/a/b.git")).toBe("github.com/a/b");
    expect(findProjectByRepo([yolo], "https://github.com/pedroazara/outro")).toBeNull();
  });
});

describe("alteração de projetos", () => {
  it("altera só o que foi enviado e relata os campos", () => {
    const { project, changedFields } = applyProjectChanges(yolo, { titleEn: "YOLOcraft", tags: [" A ", "A", "B"] }, [bench], categories);
    expect(project.titleEn).toBe("YOLOcraft");
    expect(project.tags).toEqual(["A", "B"]);
    expect(project.detailedDescription).toBe(yolo.detailedDescription);
    expect(changedFields.sort()).toEqual(["tags", "titleEn"]);
  });

  it("null remove o campo; nada muda quando o valor é igual", () => {
    expect(applyProjectChanges(yolo, { githubUrl: null }, [], categories).project).not.toHaveProperty("githubUrl");
    expect(applyProjectChanges(yolo, { title: "YOLOcraft" }, [], categories).changedFields).toEqual([]);
  });

  it("situação mantém os três campos coerentes", () => {
    const { project } = applyProjectChanges(yolo, { situacao: "andamento" }, [], categories);
    expect(project).toMatchObject({ emAndamento: true, emPlanejamento: false, status: "Em andamento" });
    const done = applyProjectChanges(project, { situacao: "concluido" }, [], categories).project;
    expect(done).toMatchObject({ emAndamento: false, emPlanejamento: false, status: "Concluído" });
    expect(summarizeProject(done).situacao).toBe("Concluído");
  });

  it("renomear guarda o código antigo e recusa um código ocupado", () => {
    const { project } = applyProjectChanges(yolo, { codigo: "Yolo Craft 2" }, [bench], categories);
    expect(project.codigo).toBe("yolo-craft-2");
    expect(project.codigosAntigos).toEqual(["yolocraft"]);
    const back = applyProjectChanges(project, { codigo: "yolocraft" }, [bench], categories).project;
    expect(back.codigosAntigos).toEqual(["yolo-craft-2"]);
    expect(() => applyProjectChanges(yolo, { codigo: "bancada" }, [bench], categories)).toThrow(/já usa/);
    expect(() => applyProjectChanges(yolo, { codigo: "proj-bench" }, [bench], categories)).toThrow(/já usa/);
  });

  it("valida categorias e mantém a principal", () => {
    const { project } = applyProjectChanges(yolo, { categoryIds: ["instrumentacao", "software"] }, [], categories);
    expect(project.categoryId).toBe("instrumentacao");
    expect(() => applyProjectChanges(yolo, { categoryIds: ["inexistente"] }, [], categories)).toThrow(/Disponíveis: software/);
  });

  it("completa o protocolo dos links e recusa imagens soltas", () => {
    expect(applyProjectChanges(yolo, { projectUrl: "yolo.dev" }, [], categories).project.projectUrl).toBe("https://yolo.dev");
    expect(applyProjectChanges(yolo, { imageUrl: "db:projects/yolocraft/capa.png" }, [], categories).project.imageUrl).toBe("db:projects/yolocraft/capa.png");
    expect(() => applyProjectChanges(yolo, { imageUrl: "capa.png" }, [], categories)).toThrow(/Imagem inválida/);
    expect(() => applyProjectChanges(yolo, { galleryImages: ["javascript:alert(1)"] }, [], categories)).toThrow(/Imagem inválida/);
  });

  it("recusa campos fora da lista", () => {
    expect(() => applyProjectChanges(yolo, { id: "outro" } as never, [], categories)).toThrow();
    expect(() => applyProjectChanges(yolo, { emAndamento: true } as never, [], categories)).toThrow();
  });
});

describe("projeto novo", () => {
  it("nasce como rascunho em andamento, com código a partir do título", () => {
    const project = buildNewProject({ title: "Óptica Não Linear!" }, [yolo], categories, 123);
    expect(project).toMatchObject({
      id: "proj-123",
      codigo: "optica-nao-linear",
      draft: true,
      emAndamento: true,
      categoryId: "software",
      categoryIds: ["software"],
    });
  });

  it("respeita o que vier explícito", () => {
    const project = buildNewProject({ title: "X", codigo: "x-1", draft: false, situacao: "planejamento", categoryIds: ["instrumentacao"] }, [], categories);
    expect(project).toMatchObject({ codigo: "x-1", draft: false, emPlanejamento: true, categoryId: "instrumentacao" });
  });
});

describe("edição por trecho", () => {
  it("troca um trecho único", () => {
    expect(editText(yolo.detailedDescription, "mAP de 0,72.", "mAP de 0,61.")).toContain("mAP de 0,72.");
  });

  it("recusa trecho ausente ou repetido", () => {
    expect(() => editText("abc", "x", "zzz")).toThrow(/não encontrado/);
    expect(() => editText("## A\n\n## A", "x", "## A")).toThrow(/2 vezes/);
  });

  it("acrescenta ao fim sem oldText", () => {
    expect(editText("Texto.\n\n", "## Novidades\n\nAlgo.")).toBe("Texto.\n\n## Novidades\n\nAlgo.");
    expect(editText(undefined, "Primeiro.")).toBe("Primeiro.");
  });

  it("não interpreta $ no texto novo como padrão de substituição", () => {
    expect(editText("custo: X", "custo: $$E = mc^2$$", "custo: X")).toBe("custo: $$E = mc^2$$");
  });
});
