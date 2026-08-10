import { ResumeData } from "../types";

export const initialResumeData: ResumeData = {
  profile: {
    name: "Pedro Henrique Almeida",
    title: "Estudante de Engenharia Física | Instrumentação & Física Computacional",
    titleEn: "Engineering Physics Student | Instrumentation & Computational Physics",
    bio: "Graduando em Engenharia Física apaixonado pela intersecção entre a física experimental avançada e a computação científica. Tenho experiência prática no desenvolvimento de instrumentação científica, simulação numérica de sistemas físicos, automação de laboratório e caracterização de semicondutores.",
    bioEn: "Engineering Physics undergraduate passionate about the intersection of advanced experimental physics and scientific computing. I have practical experience in developing scientific instrumentation, numerical simulation of physical systems, laboratory automation, and semiconductor characterization.",
    email: "PedroHenriqueAlmeida2004@gmail.com",
    phone: "+55 (11) 98765-4321",
    location: "São Paulo, SP - Brasil",
    website: "https://pedroalmeida.physics.dev",
    github: "https://github.com/pedroalmeida",
    linkedin: "https://linkedin.com/in/pedroalmeida",
    twitter: "https://twitter.com/pedro_physics",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=300&q=80"
  },
  categories: [
    {
      id: "fisica-comp",
      name: "Física Computacional & Modelagem",
      description: "Modelagem numérica, simulação de Monte Carlo, análise de elementos finitos (FEA) e algoritmos para modelagem de fenômenos quânticos e térmicos."
    },
    {
      id: "instrumentacao",
      name: "Instrumentação & Sistemas Embarcados",
      description: "Desenvolvimento de hardware para pesquisa, aquisição de dados (DAQ) em tempo real, óptica e integração de sensores e diodos laser."
    },
    {
      id: "ciencia-materiais",
      name: "Física de Semicondutores & Materiais",
      description: "Simulação de transistores, deposição de filmes finos por sputter, caracterização elétrica e técnicas espectroscópicas avançadas."
    }
  ],
  projects: [
    {
      id: "proj-1",
      codigo: "simulador-optica",
      tipo: "projeto",
      title: "Simulador de Óptica Quântica e Difração de Ondas",
      description: "Desenvolvimento de um simulador numérico em Python para calcular frentes de onda, padrões de difração de fenda dupla e modelar o colapso de estados coerentes em cavidades ressonantes tridimensionais.",
      categoryId: "fisica-comp",
      tags: ["Python", "NumPy", "SciPy", "Matplotlib", "Física Teórica"],
      status: "concluído",
      periodo: { inicio: "2023-03", fim: "2023-11" },
      stack: ["Python", "NumPy", "SciPy", "Matplotlib"],
      destaque: true,
      ordemDestaque: 1,
      projectUrl: "https://quantum-sim.exemplo.com",
      githubUrl: "https://github.com/pedroalmeida/quantum-diffraction-sim",
      imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
      featured: true,
      detailedDescription: "Este simulador foi concebido para resolver numericamente a equação de onda escalar e simular o comportamento de frentes de onda de luz coerente que passam por diferentes obstáculos de difração (fendas simples, fendas duplas e redes de difração circulares). Utiliza o princípio de Huygens-Fresnel implementado via Transformada Rápida de Fourier (FFT) bidimensional para computação de alta performance das frentes de onda no campo distante (difração de Fraunhofer). Adicionalmente, o programa inclui um módulo para simular estados coerentes de campo eletromagnético em uma cavidade de micro-ondas, permitindo visualizar as distribuições de probabilidade de Wigner e o fenômeno de decoerência sob influência de acoplamentos térmicos dissipativos.",
      scientificRelevance: "A difração e a óptica quântica são pilares cruciais para a metrologia óptica e o desenvolvimento de computadores quânticos. O entendimento numérico rigoroso da propagação de frentes de onda e do decaimento de estados coerentes em cavidades abre espaço para o design de sensores interferométricos ultra-precisos e blindagens de ruídos de fase em qubits ópticos.",
      galleryImages: [
        "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&w=600&q=80"
      ]
    },
    {
      id: "proj-2",
      codigo: "espectrofotometro",
      tipo: "projeto",
      title: "Protótipo de Espectrofotômetro de Baixo Custo",
      description: "Concepção, circuito e firmware para um espectrofotômetro digital portátil. Utiliza uma grade de difração linear de alta densidade, sensor óptico CCD linear e aquisição de dados microcontrolada para espectroscopia de absorção de soluções líquidas.",
      categoryId: "instrumentacao",
      tags: ["Arduino", "C++", "Circuitos Analógicos", "Processamento de Sinais", "Óptica"],
      status: "concluído",
      periodo: { inicio: "2023-08", fim: "2024-02" },
      stack: ["Arduino", "C++", "CCD", "Python"],
      destaque: true,
      ordemDestaque: 2,
      projectUrl: "https://spectro-diy.exemplo.com",
      githubUrl: "https://github.com/pedroalmeida/low-cost-spectrometer",
      imageUrl: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80",
      featured: true,
      detailedDescription: "Este projeto integrou conhecimentos de física óptica, eletrônica analógica e design mecânico para construir um espectrofotômetro UV-Visível funcional e de baixo custo. O feixe luminoso gerado por uma lâmpada halógena de espectro contínuo colimado é disperso angularmente por uma rede de difração linear de 1200 linhas/mm. O espectro disperso incide sobre um sensor CCD linear de 3648 pixels (TCD1304AP). Um microcontrolador de 32 bits gerencia a temporização eletrônica de integração do sensor CCD, faz a leitura das portas analógicas e transmite os perfis de intensidade para um computador via USB. Um software calibrador desenvolvido em Python realiza a conversão pixel-para-comprimento de onda por ajuste polinomial e calcula os coeficientes de absorbância e transmitância segundo a Lei de Beer-Lambert.",
      scientificRelevance: "A espectroscopia é uma técnica de caracterização indispensável em física, química e biologia. Oferecer um instrumento de baixo custo, porém acurado, democratiza a análise de espectros de absorção molecular em laboratórios acadêmicos e monitoramento de poluentes em campo aberto.",
      galleryImages: [
        "https://images.unsplash.com/photo-1601597111158-2fceff270190?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=600&q=80"
      ]
    },
    {
      id: "proj-3",
      codigo: "perovskita-sim",
      tipo: "projeto",
      title: "Simulador de Células Fotovoltaicas de Perovskita",
      description: "Implementação de um modelo unidimensional de deriva-difusão para prever o perfil de transporte de portadores de carga e a eficiência de conversão quântica em junções de semicondutores de perovskita.",
      categoryId: "ciencia-materiais",
      tags: ["MATLAB", "Física do Estado Sólido", "Semicondutores", "Dispositivos Optoeletrônicos"],
      status: "ativo",
      periodo: { inicio: "2024-01" },
      stack: ["MATLAB", "Discretização Gummel", "Física de Semicondutores"],
      destaque: false,
      projectUrl: "https://perovskite-cell.exemplo.com",
      imageUrl: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80",
      featured: false,
      blogPostId: "post-2",
      detailedDescription: "Este trabalho foca na simulação computacional de células fotovoltaicas baseadas em perovskita (CH3NH3PbI3), um dos materiais semicondutores mais promissores do cenário atual de energia limpa. O código MATLAB resolve numericamente o sistema autocoerente das equações de Poisson e de continuidade para elétrons e lacunas, incorporando processos de geração fotônica espacialmente dependentes e recombinações não radiativas de tipo Shockley-Read-Hall (SRH) e radiativas de banda a banda. A partir da discretização por diferenças finitas e algoritmo de Gummel, o simulador traça curvas de densidade de corrente por tensão (J-V), permitindo extrair parâmetros chave como corrente de curto-circuito, tensão de circuito aberto, fator de preenchimento (Fill Factor) e eficiência geral de conversão sob iluminação AM1.5G.",
      scientificRelevance: "Semicondutores baseados em perovskita revolucionaram a tecnologia solar devido à sua síntese barata e excelentes propriedades de absorção óptica. Entender teoricamente a dinâmica do transporte elétrico e como os perfis de dopagem e defeitos interfaciais afetam o rendimento quântico é crucial para direcionar a fabricação de dispositivos físicos reais de alta eficiência estável.",
      galleryImages: [
        "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80"
      ]
    },
    {
      id: "proj-4",
      codigo: "controlador-pid-laser",
      tipo: "projeto",
      title: "Controlador Térmico PID de Alta Estabilidade para Diodo Laser",
      description: "Projeto de hardware analógico e malha fechada digital baseada em PID para estabilizar a temperatura de um diodo laser de rubídio na casa dos milikelvins (mK) para experimentos de aprisionamento óptico.",
      categoryId: "instrumentacao",
      tags: ["Controle PID", "Sensores RTD", "LabVIEW", "Eletromagnetismo", "Hardware"],
      status: "concluído",
      periodo: { inicio: "2023-05", fim: "2023-10" },
      stack: ["LabVIEW", "C++", "PID Digital", "Peltier TEC"],
      destaque: true,
      ordemDestaque: 3,
      projectUrl: "https://laser-stabilizer.exemplo.com",
      githubUrl: "https://github.com/pedroalmeida/laser-pid-controller",
      imageUrl: "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&w=800&q=80",
      featured: true,
      blogPostId: "post-1",
      detailedDescription: "Desenvolvimento de uma malha fechada de controle proporcional-integral-derivativo (PID) de alto desempenho para estabilização de diodos laser de cavidade externa (ECDL) sintonizados na linha de transição atômica D2 do Rubídio-87 (780 nm). O sistema é baseado em um sensor de platina PT1000 calibrado em ponte de Wheatstone de altíssima precisão e um elemento termoelétrico Peltier (TEC). A filtragem eletrônica analógica de baixo ruído impede flutuações de EMI externas. O controle ativo digital foi programado no LabVIEW e em firmware C++, monitorando desvios térmicos em tempo real e mantendo a temperatura constante com desvio padrão experimental de apenas ±0.8 mK por períodos superiores a 12 horas seguidas.",
      scientificRelevance: "Diodos lasers são extremamente sensíveis a variações termais: mudanças de apenas 0.1°C alteram significativamente a cavidade óptica e o comprimento de onda emitido, tirando-o de ressonância atômica. Estabilidade térmica extrema na casa de milikelvins é pré-requisito mandatório para técnicas de resfriamento laser de átomos a temperaturas ultra-frias e condensados de Bose-Einstein.",
      galleryImages: [
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&w=600&q=80"
      ]
    },
    {
      id: "proj-5",
      codigo: "fea-dissipadores",
      tipo: "projeto",
      title: "Modelagem de Elementos Finitos (FEA) de Dissipadores Térmicos",
      description: "Análise térmica computacional para modelagem tridimensional de transferência de calor por condução e convecção em ligas de materiais expostas a gradientes severos de temperatura em ambiente de ultra-alto vácuo (UHV).",
      categoryId: "fisica-comp",
      tags: ["COMSOL Multiphysics", "Mecânica dos Fluidos", "Termodinâmica", "Elementos Finitos"],
      status: "concluído",
      periodo: { inicio: "2023-11", fim: "2024-03" },
      stack: ["COMSOL Multiphysics", "FEA Tridimensional", "Aço 316L / OFHC"],
      destaque: false,
      imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
      featured: false,
      detailedDescription: "Este projeto consistiu no modelamento computacional tridimensional da condução e radiação térmica sofridas por porta-amostras metálicos em câmaras de deposição em Ultra-Alto Vácuo (UHV). Sob vácuo extremo, a ausência de gás elimina a dissipação por convecção, restando apenas a condução sólida através das estruturas de fixação e a radiação térmica. Usando o software COMSOL Multiphysics, foram avaliados o tempo de resfriamento, a fadiga térmica mecânica e a anisotropia espacial da temperatura em materiais como cobre eletrolítico (OFHC), molibdênio e aço inoxidável 316L, otimizando as geometrias das aletas dissipadoras para evitar degradação de sensores piezoelétricos sensíveis acoplados.",
      scientificRelevance: "Câmaras de vácuo abrigam experimentos avançados de física de superfícies e deposição molecular por feixe epitaxial (MBE). O controle térmico computacional prévio previne danos catastróficos a flanges metal-vidro de transmissão elétrica e garante a deposição homogênea de filmes nanométricos em substratos superaquecidos.",
      galleryImages: [
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80"
      ]
    }
  ],
  experiences: [
    {
      id: "exp-1",
      company: "CNPq · Universidade Federal de Lavras",
      role: "Iniciação científica — pesquisador bolsista",
      location: "Lavras, MG · bolsista",
      startDate: "2023-08",
      endDate: "",
      current: true,
      description: "Alinhamento de cavidades de lasers de femtossegundos e caracterização de meios ativos transparentes. Automação completa da varredura de estágios motorizados de translação microscópica, com drivers em Python para osciloscópios, espectrômetros e matrizes CCD.",
      type: "research",
      skills: ["Python", "PyVISA", "Óptica ultrarrápida", "Automação de instrumentação"],
      projetos: ["controlador-pid-laser", "espectrofotometro"],
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
      description: "Coordenação do grupo de estudos",
      projetos: ["simulador-optica"]
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
      institution: "Universidade de São Paulo (USP)",
      degree: "Bacharelado",
      fieldOfStudy: "Engenharia Física",
      startDate: "2022-03",
      endDate: "2027-12",
      current: true,
      description: "Curso de graduação com forte ênfase em física teórica de base (Mecânica Quântica, Termodinâmica Estatística, Eletromagnetismo), matemática avançada e aplicações tecnológicas multidisciplinares como ciência dos materiais, microeletrônica, criogenia, fotônica e automação de instrumentação científica."
    },
    {
      id: "edu-2",
      institution: "Laboratório Nacional de Nanotecnologia (LNNano / CNPEM)",
      degree: "Curso de Extensão de Férias",
      fieldOfStudy: "Técnicas de Caracterização e Fabricação de Semicondutores",
      startDate: "2024-07",
      endDate: "2024-08",
      current: false,
      description: "Capacitação laboratorial intensiva sobre fabricação de transistores MOS em sala limpa, deposição por evaporação térmica e técnicas de microscopia eletrônica de varredura (MEV / SEM) e difratometria de raios X (DRX / XRD)."
    }
  ],
  skills: [
    { id: "s-1", name: "Python (NumPy, SciPy, Pandas)", category: "Física Computacional", level: 5 },
    { id: "s-2", name: "MATLAB & Wolfram Mathematica", category: "Física Computacional", level: 4 },
    { id: "s-3", name: "Simulação por Elementos Finitos (FEA)", category: "Física Computacional", level: 4 },
    { id: "s-4", name: "Automação Laboratorial (PyVISA / SCPI)", category: "Instrumentação & IoT", level: 5 },
    { id: "s-5", name: "Microcontroladores (Arduino / C / C++)", category: "Instrumentação & IoT", level: 4 },
    { id: "s-6", name: "Aquisição de Sinais & Sensores", category: "Instrumentação & IoT", level: 4 },
    { id: "s-7", name: "Física de Dispositivos Semicondutores", category: "Ciência dos Materiais", level: 4 },
    { id: "s-8", name: "Caracterização Física (MEV / XRD)", category: "Ciência dos Materiais", level: 3 },
    { id: "s-9", name: "Mecânica Quântica & Termodinâmica", category: "Física Teórica", level: 4 },
    { id: "s-10", name: "Eletromagnetismo Avançado", category: "Física Teórica", level: 5 }
  ],
  courses: [
    {
      id: "c-1",
      name: "Python for Data Science and Machine Learning Bootcamp",
      organization: "Udemy",
      issueDate: "2023-11",
      description: "Curso intensivo cobrindo NumPy, Pandas, Matplotlib, Seaborn, Scikit-Learn e Machine Learning aplicado a dados experimentais.",
      credentialUrl: "https://www.udemy.com/certificate/UC-123456"
    },
    {
      id: "c-2",
      name: "Introduction to Embedded Systems with ESP32",
      organization: "Coursera / University of California",
      issueDate: "2023-04",
      description: "Programação de sistemas de tempo real, arquitetura de microcontroladores, interrupções, protocolos de comunicação (SPI, I2C, UART) e amostragem de dados analógicos.",
      credentialUrl: "https://coursera.org/verify/embed-123"
    },
    {
      id: "c-3",
      name: "Optoelectronic Devices and Nanophotonics",
      organization: "edX / MITx",
      issueDate: "2024-02",
      description: "Estudo teórico e modelagem numérica de diodos emissores de luz (LEDs), diodos laser, fotodetectores e guias de onda ópticos em escala nanométrica.",
      credentialUrl: "https://credentials.edx.org/credentials/opt-456"
    }
  ],
  posts: [
    {
      id: "post-1",
      title: "Automatizando Medições em Física de Semicondutores com Python e PyVISA",
      titleEn: "Automating Semiconductor Physics Measurements with Python and PyVISA",
      summary: "Descubra como integrar osciloscópios, fontes e multímetros digitais em um fluxo de aquisição automatizado em tempo real utilizando comandos SCPI e a biblioteca PyVISA.",
      summaryEn: "Discover how to integrate oscilloscopes, source meters, and digital multimeters into a real-time automated acquisition workflow using SCPI commands and the PyVISA library.",
      content: "### Introdução à Automação Laboratorial\n\nNo ambiente de pesquisa em física experimental, a velocidade e precisão de coleta de dados são determinantes. Instrumentação manual não apenas consome tempo, mas também introduz ruídos e erros operacionais sistemáticos.\n\nNesta publicação, abordamos como o protocolo standard **IEEE 488 (GPIB)** e o padrão **VISA (Virtual Instrument Software Architecture)** podem ser controlados programaticamente usando Python. Com isso, transformamos experimentos de caracterização de curvas característica Corrente-Tensão (I-V) que levavam horas em rotinas instantâneas de segundos.\n\n### O que é o PyVISA?\n\nO `PyVISA` é uma biblioteca Python que fornece bindings fáceis de usar para a biblioteca VISA do sistema, permitindo comunicação via GPIB, RS232, Ethernet ou USB. \n\n### Um Exemplo Prático de Script de Varredura\n\nAqui está um trecho de código padrão usado em nosso laboratório para varrer a tensão de uma fonte Keithley 2400 SourceMeter e registrar a corrente resultante em um dispositivo semicondutor:\n\n```python\nimport visa\nimport time\nimport numpy as np\n\n# Abre o gerenciador de recursos\nrm = visa.ResourceManager()\nkeithley = rm.open_resource('GPIB0::22::INSTR')\n\n# Inicializa os comandos SCPI\nkeithley.write('*RST')\nkeithley.write(':SENS:FUNC \"CURR\"')\nkeithley.write(':SOUR:FUNC VOLT')\nkeithley.write(':SOUR:VOLT:START 0.0')\nkeithley.write(':SOUR:VOLT:STOP 5.0')\nkeithley.write(':SOUR:VOLT:STEP 0.1')\n\n# Ativa a saída e inicia a varredura\nkeithley.write(':OUTP ON')\n\ntensoes = np.arange(0.0, 5.1, 0.1)\ncorrentes = []\n\nfor v in tensoes:\n    keithley.write(f':SOUR:VOLT {v}')\n    time.sleep(0.05) # tempo de acomodação térmica\n    leitura = keithley.query(':READ?')\n    dados = leitura.split(',')\n    corrente = float(dados[1])\n    correntes.append(corrente)\n\nkeithley.write(':OUTP OFF')\nprint(\"Varredura concluída com sucesso!\")\n```\n\n### Conclusão\n\nAo automatizar, conseguimos realizar ensaios sob condições térmicas controladas com taxas de repetição elevadas. Isso abre caminho para a extração robusta de parâmetros como a constante de idealidade do diodo e resistências de contato em novos filmes finos semicondutores.",
      contentEn: "### Introduction to Lab Automation\n\nIn the research environment of experimental physics, the speed and accuracy of data collection are critical. Manual instrumentation is not only time-consuming but also introduces systematic human error and noise.\n\nIn this publication, we address how the standard **IEEE 488 (GPIB)** protocol and the **VISA (Virtual Instrument Software Architecture)** standard can be programmatically controlled using Python. With this, we turn semiconductor Current-Voltage (I-V) characterization experiments that used to take hours into instant routines completed in seconds.\n\n### What is PyVISA?\n\n`PyVISA` is a Python library that provides easy-to-use bindings to the system VISA library, enabling communication via GPIB, RS232, Ethernet, or USB.\n\n### A Practical Sweep Script Example\n\nHere is a code snippet standardly used in our laboratory to sweep voltage from a Keithley 2400 SourceMeter and log the resulting current on a semiconductor device:\n\n```python\nimport visa\nimport time\nimport numpy as np\n\n# Open resource manager\nrm = visa.ResourceManager()\nkeithley = rm.open_resource('GPIB0::22::INSTR')\n\n# Initialize SCPI commands\nkeithley.write('*RST')\nkeithley.write(':SENS:FUNC \"CURR\"')\nkeithley.write(':SOUR:FUNC VOLT')\nkeithley.write(':SOUR:VOLT:START 0.0')\nkeithley.write(':SOUR:VOLT:STOP 5.0')\nkeithley.write(':SOUR:VOLT:STEP 0.1')\n\n# Turn output on and start sweep\nkeithley.write(':OUTP ON')\n\nvoltages = np.arange(0.0, 5.1, 0.1)\ncurrents = []\n\nfor v in voltages:\n    keithley.write(f':SOUR:VOLT {v}')\n    time.sleep(0.05) # thermal stabilization time\n    reading = keithley.query(':READ?')\n    data = reading.split(',')\n    current = float(data[1])\n    currents.append(current)\n\nkeithley.write(':OUTP OFF')\nprint(\"Sweep completed successfully!\")\n```\n\n### Conclusion\n\nBy automating, we can conduct testing under controlled thermal conditions with high repetition rates. This opens doors for robust parameter extraction, such as the diode ideality factor and contact resistances in novel thin-film semiconductor materials.",
      date: "2026-05-15",
      tags: ["Python", "Instrumentação", "Semicondutores", "SCPI"],
      imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
      readTime: "5 min read",
      category: "Instrumentação",
      codigo: "automacao-medicoes",
      tipo: "artigo",
      projetos: ["controlador-pid-laser", "espectrofotometro"]
    },
    {
      id: "post-2",
      title: "Desvendando Semicondutores de Perovskita para Células Solares de Próxima Geração",
      titleEn: "Unveiling Perovskite Semiconductors for Next-Generation Solar Cells",
      summary: "Uma revisão profunda da física do estado sólido por trás das perovskitas híbridas orgânico-inorgânicas e os desafios de estabilidade molecular para viabilização comercial.",
      summaryEn: "A deep review of the solid-state physics behind hybrid organic-inorganic perovskites and molecular stability challenges for commercial viability.",
      content: "### O que são Perovskitas?\n\nAs perovskitas são materiais estruturais que compartilham a mesma estrutura cristalográfica que o titanato de cálcio ($CaTiO_3$), representada pela fórmula geral $ABX_3$. No contexto da optoeletrônica, as **perovskitas híbridas orgânico-inorgânicas** (como o triiodeto de metilamônio e chumbo, $CH_3NH_3PbI_3$) surgiram como materiais revolucionários.\n\nEm menos de uma década, a eficiência de conversão de energia das células fotovoltaicas baseadas neste composto disparou de menos de 4% em 2009 para mais de **26% em escala laboratorial**, um ritmo de evolução nunca antes observado na história do setor de energia solar.\n\n### Propriedades Físicas Notáveis\n\nO sucesso meteórico das perovskitas se deve a características de física de semicondutores extremamente favoráveis:\n\n1. **Coeficiente de absorção óptica extremamente alto**: Uma camada de apenas 500 nanômetros é capaz de absorver quase todos os fótons incidentes com energia superior ao seu bandgap.\n2. **Bandgap sintonizável**: Modificando a proporção de halogênios (trocando iodo por bromo ou cloro), é possível ajustar a largura de banda proibida de 1.2 eV a até 2.3 eV, ideal para células tandem de dupla junção.\n3. **Grande comprimento de difusão de portadores de carga**: Os elétrons e lacunas foto-gerados conseguem caminhar por centenas de nanômetros antes de sofrer recombinação, permitindo alta eficiência de coleta de corrente.\n\n### O Calcanhar de Aquiles: Estabilidade\n\nApesar dos números impressionantes, o grande entrave para a comercialização em massa reside na estabilidade estrutural. As perovskitas são altamente hidrofílicas, degradando-se rapidamente em presença de umidade e radiação UV na atmosfera padrão. Atualmente, os esforços de pesquisa do nosso laboratório se voltam para técnicas de passivação de superfícies e encapsulamento em camadas moleculares hidrofóbicas para contornar esses mecanismos de degradação.",
      contentEn: "### What are Perovskites?\n\nPerovskites are structural materials that share the same crystallographic structure as calcium titanate ($CaTiO_3$), represented by the general formula $ABX_3$. In the context of optoelectronics, **hybrid organic-inorganic perovskites** (such as methylammonium lead triiodide, $CH_3NH_3PbI_3$) have emerged as revolutionary materials.\n\nIn less than a decade, the power conversion efficiency of solar cells based on this compound shot up from less than 4% in 2009 to over **26% at laboratory scale**, a pace of evolution never before observed in the history of solar energy.\n\n### Key Physical Properties\n\nThe meteoric success of perovskites is due to highly favorable semiconductor physics traits:\n\n1. **Extremely High Optical Absorption Coefficient**: A layer of just 500 nanometers can absorb almost all incident photons with energy above its bandgap.\n2. **Tunable Bandgap**: By altering the halide ratio (substituting iodine with bromine or chlorine), one can tune the bandgap from 1.2 eV up to 2.3 eV, ideal for dual-junction tandem solar cells.\n3. **Long Carrier Diffusion Length**: Photogenerated electrons and holes can travel hundreds of nanometers before recombining, allowing for high current collection efficiency.\n\n### The Achilles' Heel: Stability\n\nDespite the impressive numbers, the main barrier to mass commercialization lies in structural stability. Perovskites are highly hydrophilic, degrading rapidly under humidity and UV radiation in standard ambient atmospheres. Currently, our research lab efforts focus on surface passivation techniques and hydrophobic molecular layer encapsulation to bypass these degradation pathways.",
      date: "2026-06-10",
      tags: ["Ciência dos Materiais", "Semicondutores", "Fotovoltaica", "Física de Dispositivos"],
      imageUrl: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80",
      readTime: "7 min read",
      category: "Ciência dos Materiais",
      codigo: "desvendando-perovskitas",
      tipo: "artigo",
      projetos: ["perovskita-sim"]
    }
  ]
};

