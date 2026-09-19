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

  const topSkills = [...(data.skills || [])]
    .sort((a, b) => (b.level || 0) - (a.level || 0))
    .slice(0, 6)
    .map((s) => (isEn && s.nameEn) || s.name)
    .filter(Boolean);

  // Roteiro numerado do "sobre mim", nessa ordem fixa — cada linha é só o
  // rótulo do tópico; o conteúdo de cada um é falado, não escrito no slide.
  // Competências e motivação ficam de fora: já têm slide próprio depois.
  const quemSouEuBody = (
    isEn ? ["Background", "Education", "Profile & interests"] : ["Origem", "Formação", "Perfil e interesses"]
  ).join("\n");

  const experiencias = data.experiences || [];
  const experienciaPrincipal = experiencias.find((e) => e.current) || experiencias[0];

  const habilidadesBody = [
    experienciaPrincipal ? `${experienciaPrincipal.role} — ${experienciaPrincipal.company}` : "",
    topSkills.join(" · "),
  ]
    .filter(Boolean)
    .join("\n");

  const motivacaoBody = isEn
    ? "An interest since childhood\nA choice that took shape during my degree\nWhy scientific instrumentation?"
    : "Um interesse desde a infância\nUma escolha que ganhou sentido na graduação\nPor que instrumentação científica?";

  return {
    // O nome vira o título grande do slide de abertura — "Quem sou eu" seria
    // uma legenda óbvia repetindo o que a foto e o próprio ato de falar já dizem.
    quemSouEu: { title: p.name || (isEn ? "Who I am" : "Quem sou eu"), body: quemSouEuBody },
    habilidades: { title: isEn ? "Skills & experience" : "Habilidades & experiência", body: habilidadesBody },
    motivacao: { title: isEn ? "Motivation" : "Motivação", body: motivacaoBody },
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
      // Atualiza apenas os textos padrão antigos, preservando edições pessoais.
      const antigos = [
        "Por que este programa me interessa\nComo meus projetos se conectam a isso",
        "Why this program interests me\nHow my projects connect to it",
        "Um interesse desde a infância\nUma escolha que ganhou sentido na graduação\nPor que instrumentação",
        "An interest since childhood\nA choice that took shape during my degree\nWhy instrumentation",
      ];
      if (salvo.motivacao) {
        const padrao = gerarRascunhoPadrao(data, language).motivacao;
        let atualizado = false;
        if (antigos.includes(salvo.motivacao.body.replace(/\r\n/g, "\n").trim())) {
          salvo.motivacao.body = padrao.body;
          atualizado = true;
        }
        if (["Por que este programa", "Why this program"].includes(salvo.motivacao.title)) {
          salvo.motivacao.title = padrao.title;
          atualizado = true;
        }
        if (atualizado) salvarRascunho(salvo as PitchDraft);
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
