import { ResumeData } from "../types";

/**
 * Conteúdo inicial do site.
 *
 * Este arquivo é só o ponto de partida: assim que existir uma linha na tabela
 * `portfolio` do Supabase, ela tem precedência e tudo aqui é ignorado. Edite
 * pelo painel de administração, não por aqui.
 *
 * Os itens marcados com `draft: true` só aparecem para você, no modo de edição.
 * Preencha e desmarque quando quiser publicá-los.
 */
export const initialResumeData: ResumeData = {
  profile: {
    name: "Pedro Henrique Almeida",
    title: "Estudante de Engenharia Física | Instrumentação & Física Computacional",
    titleEn: "Engineering Physics Student | Instrumentation & Computational Physics",
    bio: "Graduando em Engenharia Física na UFLA, atuando na intersecção entre física experimental e computação científica. Trabalho com instrumentação de laboratório, automação de medidas e óptica ultrarrápida em iniciação científica.",
    bioEn: "Engineering Physics undergraduate at UFLA, working at the intersection of experimental physics and scientific computing. My focus is laboratory instrumentation, measurement automation, and ultrafast optics through undergraduate research.",
    email: "pedrohenriquealmeida2004@gmail.com",
    // Campos em branco: preencha pelo painel se quiser exibi-los.
    phone: "",
    location: "Lavras, MG - Brasil",
    website: "",
    github: "https://github.com/pedroazara",
    linkedin: "",
    twitter: "",
    lattesUrl: "http://lattes.cnpq.br/",
    orcidUrl: "",
    siteRepoUrl: "https://github.com/pedroazara/portfolio",
    avatarUrl: ""
  },
  categories: [
    {
      id: "instrumentacao",
      name: "Instrumentação & Automação",
      nameEn: "Instrumentation & Automation",
      description: "Automação de bancadas, aquisição de dados, controle de instrumentos e integração de sensores.",
      descriptionEn: "Bench automation, data acquisition, instrument control, and sensor integration."
    },
    {
      id: "fisica-comp",
      name: "Física Computacional & Modelagem",
      nameEn: "Computational Physics & Modeling",
      description: "Modelagem numérica, simulação e análise de dados experimentais.",
      descriptionEn: "Numerical modeling, simulation, and analysis of experimental data."
    },
    {
      id: "software",
      name: "Software & Visão Computacional",
      nameEn: "Software & Computer Vision",
      description: "Aplicações web, ferramentas de apoio à pesquisa e modelos de detecção em imagens.",
      descriptionEn: "Web applications, research support tooling, and image detection models."
    }
  ],
  projects: [
    {
      id: "proj-portfolio",
      codigo: "portfolio-site",
      tipo: "projeto",
      title: "Portfólio Acadêmico com Painel de Edição",
      titleEn: "Academic Portfolio with Built-in Editor",
      description: "Este site. Currículo, portfólio e blog num só lugar, com painel de administração que permite editar todo o conteúdo pelo navegador — sem recompilar nada.",
      descriptionEn: "This website. Résumé, portfolio, and blog in one place, with an admin panel that edits all content straight from the browser — no rebuild required.",
      categoryId: "software",
      tags: ["React", "TypeScript", "Vite", "Tailwind CSS", "Supabase"],
      status: "ativo",
      periodo: { inicio: "2026-06" },
      stack: ["React 19", "TypeScript", "Vite", "Tailwind CSS v4", "Supabase", "Postgres"],
      destaque: true,
      ordemDestaque: 1,
      featured: true,
      githubUrl: "https://github.com/pedroazara/portfolio",
      projectUrl: "https://pedroazara.vercel.app",
      detailedDescription: "Aplicação React de página única que funciona como currículo, portfólio de projetos e blog técnico. O diferencial é o modo de edição embutido: autenticado, o conteúdo do site inteiro — perfil, projetos, formação, artigos — é editável direto na interface, e cada alteração é gravada no Postgres do Supabase.\n\nDetalhes de implementação:\n\n- **Persistência em duas camadas.** Toda edição vai imediatamente para o `localStorage` e, com atraso de 1,2 s, para o Supabase. O agrupamento por debounce transforma uma sequência de digitação numa única gravação, em vez de uma por tecla.\n- **Autenticação e RLS.** O login usa Supabase Auth; as políticas de Row Level Security decidem no servidor quem pode escrever. A chave que vai no navegador é pública e não concede escrita nenhuma.\n- **Banco de imagens.** As imagens são arquivos num bucket público servido por CDN, com URLs determinísticas — dá para montar a URL a partir do nome, sem consulta ao banco.\n- **Pré-renderização.** Um script gera HTML estático para cada rota antes do deploy, além de `sitemap.xml` e `robots.txt`, para que buscadores e prévias de link leiam o conteúdo sem executar JavaScript.\n- **Bilíngue e exportável.** Todo o conteúdo tem campos paralelos em português e inglês, e o currículo é exportável em PDF pelo próprio navegador.",
      scientificRelevance: "Divulgação científica depende de o trabalho ser encontrável e legível. Um portfólio que o próprio pesquisador atualiza sem depender de terceiros — e que é indexável por buscadores — reduz o atrito entre produzir e comunicar pesquisa.",
      galleryImages: []
    },
    {
      id: "proj-yolocraft",
      codigo: "yolocraft",
      tipo: "projeto",
      title: "YOLOcraft — Detecção de Objetos em Imagens",
      titleEn: "YOLOcraft — Object Detection in Images",
      description: "Projeto de visão computacional usando arquitetura YOLO para detecção de objetos em imagens.",
      descriptionEn: "Computer vision project using a YOLO architecture for object detection in images.",
      categoryId: "software",
      tags: ["Python", "Visão Computacional", "YOLO", "Deep Learning"],
      status: "concluído",
      periodo: { inicio: "2025-01" },
      stack: ["Python", "YOLO", "OpenCV"],
      destaque: true,
      ordemDestaque: 2,
      featured: true,
      imageUrl: "db:yolocraft.png",
      // As imagens deste projeto já estão no banco (yolocraft-deteccao-e-*.webp).
      // Complete a descrição detalhada e a galeria pelo painel.
      detailedDescription: "",
      scientificRelevance: "",
      galleryImages: []
    },
    {
      id: "proj-ic-automacao",
      codigo: "automacao-bancada-ic",
      tipo: "projeto",
      title: "Automação da bancada de óptica ultrarrápida",
      titleEn: "Ultrafast Optics Bench Automation",
      description: "Descreva aqui os drivers em Python para osciloscópios, espectrômetros e estágios de translação desenvolvidos na iniciação científica.",
      categoryId: "instrumentacao",
      tags: ["Python", "PyVISA", "Automação"],
      status: "ativo",
      periodo: { inicio: "2023-08" },
      stack: ["Python", "PyVISA"],
      draft: true,
      galleryImages: []
    },
    {
      id: "proj-esqueleto-2",
      codigo: "projeto-a-preencher-1",
      tipo: "projeto",
      title: "Projeto a preencher",
      description: "Ficha em branco: troque título, descrição, stack e período pelo painel, depois desmarque o rascunho para publicar.",
      categoryId: "fisica-comp",
      tags: [],
      status: "ativo",
      draft: true,
      galleryImages: []
    },
    {
      id: "proj-esqueleto-3",
      codigo: "projeto-a-preencher-2",
      tipo: "projeto",
      title: "Projeto a preencher",
      description: "Ficha em branco: troque título, descrição, stack e período pelo painel, depois desmarque o rascunho para publicar.",
      categoryId: "instrumentacao",
      tags: [],
      status: "ativo",
      draft: true,
      galleryImages: []
    }
  ],
  experiences: [
    {
      id: "exp-1",
      company: "CNPq · Universidade Federal de Lavras",
      role: "Iniciação científica — pesquisador bolsista",
      roleEn: "Undergraduate Research Fellow",
      location: "Lavras, MG · bolsista",
      startDate: "2023-08",
      endDate: "",
      current: true,
      description: "Alinhamento de cavidades de lasers de femtossegundos e caracterização de meios ativos transparentes. Automação da varredura de estágios motorizados de translação, com drivers em Python para osciloscópios, espectrômetros e matrizes CCD.",
      descriptionEn: "Alignment of femtosecond laser cavities and characterization of transparent active media. Automation of motorized translation stage scanning, with Python drivers for oscilloscopes, spectrometers, and CCD arrays.",
      type: "research",
      skills: ["Python", "PyVISA", "Óptica ultrarrápida", "Automação de instrumentação"],
      projetos: ["automacao-bancada-ic"],
      subperiods: [
        {
          id: "sub-1",
          startDate: "2023-08",
          endDate: "2025-09",
          title: "Caracterização de meios ativos e instrumentação do laboratório",
          description: "Caracterização de meios ativos e instrumentação do laboratório"
        },
        {
          id: "sub-2",
          startDate: "2025-09",
          current: true,
          title: "Renovação de bolsa",
          description: ""
        }
      ]
    }
  ],
  academicActivities: [
    {
      id: "act-1",
      name: "Nexus",
      startDate: "2024",
      current: true,
      description: "Coordenação do grupo de estudos"
    },
    {
      id: "act-2",
      name: "Núcleo de estudos",
      startDate: "2023",
      endDate: "2024",
      description: "Uma linha sobre o foco do grupo"
    },
    {
      id: "act-3",
      name: "Monitoria",
      startDate: "2025",
      description: "Disciplina e carga horária"
    },
    {
      id: "act-4",
      name: "Projeto de extensão",
      startDate: "2024",
      current: true,
      description: "Uma linha sobre a atuação"
    }
  ],
  educations: [
    {
      id: "edu-1",
      institution: "Universidade Federal de Lavras (UFLA)",
      institutionEn: "Federal University of Lavras (UFLA)",
      degree: "Bacharelado",
      degreeEn: "Bachelor's Degree",
      fieldOfStudy: "Engenharia Física",
      fieldOfStudyEn: "Engineering Physics",
      startDate: "2022-03",
      endDate: "2027-12",
      current: true,
      description: "Formação multidisciplinar em física teórica e experimental, matemática avançada, física computacional, análise de dados e instrumentação científica.",
      descriptionEn: "Multidisciplinary training in theoretical and experimental physics, advanced mathematics, computational physics, data analysis, and scientific instrumentation."
    }
  ],
  skills: [
    { id: "s-1", name: "Python (NumPy, SciPy, Pandas)", category: "Física Computacional", level: 5 },
    { id: "s-2", name: "Análise de dados experimentais", category: "Física Computacional", level: 4 },
    { id: "s-3", name: "Automação laboratorial (PyVISA / SCPI)", category: "Instrumentação", level: 5 },
    { id: "s-4", name: "Óptica ultrarrápida e alinhamento de cavidades", category: "Instrumentação", level: 4 },
    { id: "s-5", name: "Aquisição de sinais & sensores", category: "Instrumentação", level: 4 },
    { id: "s-6", name: "Visão computacional (YOLO / OpenCV)", category: "Software", level: 3 },
    { id: "s-7", name: "React & TypeScript", category: "Software", level: 4 },
    { id: "s-8", name: "Mecânica quântica & termodinâmica", category: "Física Teórica", level: 4 },
    { id: "s-9", name: "Eletromagnetismo avançado", category: "Física Teórica", level: 4 }
  ],
  // Adicione seus certificados reais pelo painel. Os que estavam aqui antes
  // tinham links de credencial inventados e foram removidos.
  courses: [],
  posts: [
    {
      id: "post-1",
      codigo: "automacao-medicoes",
      tipo: "artigo",
      title: "Automatizando Medições com Python e PyVISA",
      titleEn: "Automating Measurements with Python and PyVISA",
      summary: "Como integrar osciloscópios, fontes e multímetros digitais num fluxo de aquisição automatizado usando comandos SCPI e a biblioteca PyVISA.",
      summaryEn: "How to integrate oscilloscopes, source meters, and digital multimeters into an automated acquisition workflow using SCPI commands and the PyVISA library.",
      content: "### Introdução à automação laboratorial\n\nNo ambiente de pesquisa em física experimental, a velocidade e a precisão da coleta de dados são determinantes. Operar instrumentos à mão não apenas consome tempo: introduz erros sistemáticos difíceis de rastrear depois.\n\nEste texto aborda como o protocolo **IEEE 488 (GPIB)** e o padrão **VISA (Virtual Instrument Software Architecture)** podem ser controlados programaticamente em Python, transformando varreduras que levariam horas em rotinas de segundos.\n\n### O que é o PyVISA?\n\nO `PyVISA` é uma biblioteca Python que expõe a biblioteca VISA do sistema, permitindo comunicação via GPIB, RS232, Ethernet ou USB com uma interface única.\n\n### Um exemplo de script de varredura\n\nVarredura de tensão numa fonte Keithley 2400, registrando a corrente resultante:\n\n```python\nimport pyvisa\nimport time\nimport numpy as np\n\nrm = pyvisa.ResourceManager()\nkeithley = rm.open_resource(\"GPIB0::22::INSTR\")\n\nkeithley.write(\"*RST\")\nkeithley.write(':SENS:FUNC \"CURR\"')\nkeithley.write(\":SOUR:FUNC VOLT\")\nkeithley.write(\":OUTP ON\")\n\ntensoes = np.arange(0.0, 5.05, 0.1)\ncorrentes = []\n\nfor v in tensoes:\n    keithley.write(f\":SOUR:VOLT {v}\")\n    time.sleep(0.05)  # tempo de acomodação\n    leitura = keithley.query(\":READ?\")\n    correntes.append(float(leitura.split(\",\")[1]))\n\nkeithley.write(\":OUTP OFF\")\nprint(\"Varredura concluída.\")\n```\n\n### Conclusão\n\nAutomatizar permite repetir ensaios sob condições controladas com alta taxa de repetição, o que abre caminho para extração robusta de parâmetros a partir de estatística, e não de uma medida isolada.",
      contentEn: "### Introduction to lab automation\n\nIn experimental physics research, the speed and accuracy of data collection are decisive. Operating instruments by hand is not only slow: it introduces systematic errors that are hard to trace afterwards.\n\nThis text covers how the **IEEE 488 (GPIB)** protocol and the **VISA (Virtual Instrument Software Architecture)** standard can be driven programmatically from Python, turning sweeps that would take hours into routines that take seconds.\n\n### What is PyVISA?\n\n`PyVISA` is a Python library exposing the system VISA library, enabling communication over GPIB, RS232, Ethernet, or USB through a single interface.\n\n### A sweep script example\n\nVoltage sweep on a Keithley 2400, logging the resulting current:\n\n```python\nimport pyvisa\nimport time\nimport numpy as np\n\nrm = pyvisa.ResourceManager()\nkeithley = rm.open_resource(\"GPIB0::22::INSTR\")\n\nkeithley.write(\"*RST\")\nkeithley.write(':SENS:FUNC \"CURR\"')\nkeithley.write(\":SOUR:FUNC VOLT\")\nkeithley.write(\":OUTP ON\")\n\nvoltages = np.arange(0.0, 5.05, 0.1)\ncurrents = []\n\nfor v in voltages:\n    keithley.write(f\":SOUR:VOLT {v}\")\n    time.sleep(0.05)  # settling time\n    reading = keithley.query(\":READ?\")\n    currents.append(float(reading.split(\",\")[1]))\n\nkeithley.write(\":OUTP OFF\")\nprint(\"Sweep complete.\")\n```\n\n### Conclusion\n\nAutomation lets you repeat measurements under controlled conditions at a high repetition rate, which opens the door to extracting parameters from statistics rather than from a single reading.",
      date: "2026-05-15",
      tags: ["Python", "Instrumentação", "PyVISA", "SCPI"],
      readTime: "",
      category: "Instrumentação",
      categoryEn: "Instrumentation",
      // Revise o texto e desmarque o rascunho para publicar.
      draft: true
    }
  ]
};
