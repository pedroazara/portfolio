import { Project, ProjectCategory, ResumeData } from "../types";
import { Language } from "../lib/translations";

export interface PitchSlideText {
  title: string;
  body: string;
}

/**
 * Os três slides de texto do elevator pitch, mais a seleção de projetos do
 * slide de destaques. O conteúdo desse slide não é texto solto — é a lista de
 * `id`s escolhidos entre os projetos reais, na ordem em que aparecem.
 */
export interface PitchDraft {
  quemSouEu: PitchSlideText;
  habilidades: PitchSlideText;
  motivacao: PitchSlideText;
  projetosSelecionados: string[];
}

const STORAGE_KEY = "elevator_pitch_v1";

/** Projetos em destaque primeiro; sem nenhum marcado, os seis mais recentes. */
export function selecaoPadraoDeProjetos(projects: Project[]): string[] {
  const visiveis = projects.filter((p) => !p.draft);
  const destacados = visiveis.filter((p) => p.featured || p.destaque);
  const base = destacados.length > 0 ? destacados : visiveis.slice(0, 6);
  return base.map((p) => p.id);
}

export interface GrupoDeProjetos {
  /** `null` = projetos sem nenhuma categoria reconhecida. */
  categoria: ProjectCategory | null;
  itens: Project[];
}

/**
 * Agrupa projetos por categoria, na ordem em que as categorias existem.
 * Usado tanto na lista de seleção do editor quanto no slide apresentado —
 * as duas telas precisam mostrar os projetos na mesma ordem.
 */
export function agruparPorCategoria(projects: Project[], categories: ProjectCategory[]): GrupoDeProjetos[] {
  const grupos: GrupoDeProjetos[] = categories
    .map((categoria) => ({
      categoria,
      itens: projects.filter((p) =>
        p.categoryIds && p.categoryIds.length > 0
          ? p.categoryIds.includes(categoria.id)
          : p.categoryId === categoria.id
      ),
    }))
    .filter((g) => g.itens.length > 0);

  const jaAgrupados = new Set(grupos.flatMap((g) => g.itens.map((p) => p.id)));
  const semCategoria = projects.filter((p) => !jaAgrupados.has(p.id));
  if (semCategoria.length > 0) grupos.push({ categoria: null, itens: semCategoria });

  return grupos;
}

/**
 * Rascunho inicial, composto a partir do que já está no currículo — perfil,
 * experiência mais recente, competências de maior nível e os projetos em
 * destaque. Ponto de partida, não texto final: quem usa reescreve com a
 * própria voz antes de ensaiar.
 *
 * Cada linha do corpo vira um elemento visual no slide (um selo curto, ou uma
 * frase, dependendo do tamanho) — por isso o padrão já nasce em frases curtas,
 * uma por linha, em vez de parágrafos copiados do currículo. Um parágrafo
 * inteiro é o que se lê; um slide é o que se aponta enquanto se fala.
 */
export function gerarRascunhoPadrao(data: ResumeData, language: Language): PitchDraft {
  const isEn = language === "en";
  const p = data.profile;

  const titulo = (isEn && p.titleEn) || p.title || "";
  const topSkills = [...(data.skills || [])]
    .sort((a, b) => (b.level || 0) - (a.level || 0))
    .slice(0, 6)
    .map((s) => (isEn && s.nameEn) || s.name)
    .filter(Boolean);

  // O nome já é o slide — cargo e local viram só dois selos de apoio.
  // Competências ficam de fora daqui: são o assunto do próximo slide de
  // texto, repeti-las aqui era a mesma informação duas vezes.
  const quemSouEuBody = [titulo, p.location || ""].filter(Boolean).join("\n");

  const experiencias = data.experiences || [];
  const experienciaPrincipal = experiencias.find((e) => e.current) || experiencias[0];

  const habilidadesBody = [
    experienciaPrincipal ? `${experienciaPrincipal.role} — ${experienciaPrincipal.company}` : "",
    topSkills.join(" · "),
  ]
    .filter(Boolean)
    .join("\n");

  const motivacaoBody = isEn
    ? "Why this program interests me\nHow my projects connect to it"
    : "Por que este programa me interessa\nComo meus projetos se conectam a isso";

  return {
    // O nome vira o título grande do slide de abertura — "Quem sou eu" seria
    // uma legenda óbvia repetindo o que a foto e o próprio ato de falar já dizem.
    quemSouEu: { title: p.name || (isEn ? "Who I am" : "Quem sou eu"), body: quemSouEuBody },
    habilidades: { title: isEn ? "Skills & experience" : "Habilidades & experiência", body: habilidadesBody },
    motivacao: { title: isEn ? "Why this program" : "Por que este programa", body: motivacaoBody },
    projetosSelecionados: selecaoPadraoDeProjetos(data.projects),
  };
}

/**
 * O rascunho salvo neste navegador, ou o padrão gerado do currículo quando
 * ainda não existe um. Fica só no `localStorage` — é material de ensaio para
 * uma entrevista específica, não conteúdo do site, e não faz sentido
 * sincronizar com a nuvem nem aparecer para quem visita o portfólio.
 */
export function carregarRascunho(data: ResumeData, language: Language): PitchDraft {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (bruto) {
      const salvo = JSON.parse(bruto) as Partial<PitchDraft>;
      // Rascunhos salvos antes do slide de projetos existir ainda não têm a
      // seleção — sem isso, a chave viria `undefined` e o slide nasceria vazio.
      if (!salvo.projetosSelecionados) {
        salvo.projetosSelecionados = selecaoPadraoDeProjetos(data.projects);
      }
      return salvo as PitchDraft;
    }
  } catch {
    // Dado corrompido ou localStorage indisponível — cai no padrão.
  }
  return gerarRascunhoPadrao(data, language);
}

export function salvarRascunho(draft: PitchDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Modo privado ou cota cheia — perde-se só a persistência entre sessões.
  }
}
