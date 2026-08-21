import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ResumeData, Profile, Project, ProjectCategory, Experience, AcademicActivity, Education, Skill, SkillCategory, Course, BlogPost } from "./types";
import { initialResumeData } from "./data/initialData";
import ResumeHeader from "./components/ResumeHeader";
import ProjectSection from "./components/ProjectSection";
import ExperienceEducationSection from "./components/ExperienceEducationSection";
import CoursesSection from "./components/CoursesSection";
import SkillsSection from "./components/SkillsSection";
import AdminStrip from "./components/AdminStrip";
import GlobalHeader from "./components/GlobalHeader";
import SectionHeader from "./components/SectionHeader";
import BlogSection from "./components/BlogSection";
import LoginModal from "./components/LoginModal";
import ImageBankModal from "./components/ImageBankModal";
import AdminManagementModal from "./components/AdminManagementModal";
import PdfPreviewModal from "./components/PdfPreviewModal";
import Footer from "./components/Footer";
import LocalImage from "./components/LocalImage";
import { OrbitaIcon } from "./components/OrbitaIcon";
import { Sparkles, CheckCircle2, Lock, Atom, FileText, BookOpen, Cloud, CloudOff, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "./lib/translations";
import { fetchResumeData, saveResumeData, StaleWriteError } from "./lib/dataService";
import { maybeRunDailyFullBackup } from "./lib/fullBackupService";
import { observeAuth, logout } from "./lib/auth";
import { findBySlug } from "./utils/slug";
import { isDevPreview } from "./lib/devPreview";
import { stripLocale, localePath, switchLanguagePath } from "./lib/routes";
import PostEditorPage from "./pages/PostEditorPage";
import ProjectEditorPage from "./pages/ProjectEditorPage";
import AdminHubPage, { AdminHubTab, ADMIN_HUB_TABS } from "./pages/AdminHubPage";
import PostPage from "./pages/PostPage";
import ProjectPage from "./pages/ProjectPage";

const STORAGE_KEY = "curriculo_portfolio_data_v1";
const EDIT_MODE_KEY = "curriculo_portfolio_edit_mode_v1";

// Intervalo de espera antes de gravar na nuvem, para que uma sequência de
// digitação vire uma única escrita em vez de uma por tecla.
const CLOUD_SAVE_DEBOUNCE_MS = 1200;

const sanitizeResumeData = (data: any): ResumeData => {
  return {
    profile: {
      name: data?.profile?.name ?? initialResumeData.profile.name,
      title: data?.profile?.title ?? initialResumeData.profile.title,
      titleEn: data?.profile?.titleEn ?? initialResumeData.profile.titleEn ?? "",
      bio: data?.profile?.bio ?? initialResumeData.profile.bio,
      bioEn: data?.profile?.bioEn ?? initialResumeData.profile.bioEn ?? "",
      email: data?.profile?.email ?? initialResumeData.profile.email,
      phone: data?.profile?.phone ?? initialResumeData.profile.phone,
      location: data?.profile?.location ?? initialResumeData.profile.location,
      website: data?.profile?.website ?? initialResumeData.profile.website ?? "",
      github: data?.profile?.github ?? initialResumeData.profile.github ?? "",
      linkedin: data?.profile?.linkedin ?? initialResumeData.profile.linkedin ?? "",
      twitter: data?.profile?.twitter ?? initialResumeData.profile.twitter ?? "",
      lattesUrl: data?.profile?.lattesUrl || initialResumeData.profile.lattesUrl || "http://lattes.cnpq.br/",
      orcidUrl: data?.profile?.orcidUrl ?? initialResumeData.profile.orcidUrl ?? "",
      siteRepoUrl: (data?.profile?.siteRepoUrl && !data.profile.siteRepoUrl.includes("pedroalmeida/portfolio")) 
        ? data.profile.siteRepoUrl 
        : "https://github.com/pedroazara/portfolio",
      avatarUrl: data?.profile?.avatarUrl ?? initialResumeData.profile.avatarUrl ?? "",
    },
    categories: Array.isArray(data?.categories) ? data.categories : (initialResumeData.categories || []),
    projects: Array.isArray(data?.projects) ? data.projects : (initialResumeData.projects || []),
    experiences: Array.isArray(data?.experiences) ? data.experiences : (initialResumeData.experiences || []),
    academicActivities: Array.isArray(data?.academicActivities) ? data.academicActivities : (initialResumeData.academicActivities || []),
    educations: Array.isArray(data?.educations) ? data.educations : (initialResumeData.educations || []),
    skills: Array.isArray(data?.skills) ? data.skills : (initialResumeData.skills || []),
    skillCategories: Array.isArray(data?.skillCategories) ? data.skillCategories : (initialResumeData.skillCategories || []),
    courses: Array.isArray(data?.courses) ? data.courses : (initialResumeData.courses || []),
    posts: Array.isArray(data?.posts) ? data.posts : (initialResumeData.posts || []),
  };
};

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("portfolio_dark_mode_v1");
    if (saved !== null) return saved === "true";
    return false; // Light theme by default
  });

  useEffect(() => {
    localStorage.setItem("portfolio_dark_mode_v1", String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Quando a leitura inicial da nuvem falha, não sabemos o que já existe lá.
  // Bloqueamos a gravação nesta sessão para não sobrescrever dados na nuvem
  // com uma cópia local possivelmente desatualizada.
  const [cloudReadFailed, setCloudReadFailed] = useState(false);

  // Load initial resume state from localStorage or template
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeData);

  // Title effect handled dynamically by route meta effect below

  // Busca os dados na nuvem, com queda para a cópia local
  useEffect(() => {
    function loadFromLocalStorage() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      try {
        setResumeData(sanitizeResumeData(JSON.parse(saved)));
      } catch (err) {
        console.error("Erro ao ler dados salvos no LocalStorage:", err);
      }
    }

    async function loadData() {
      try {
        const { data: cloudData, version } = await fetchResumeData();
        cloudVersionRef.current = version;
        if (cloudData) {
          setResumeData(sanitizeResumeData(cloudData));
        } else {
          // O documento ainda não existe na nuvem: usa a cópia local, se houver.
          loadFromLocalStorage();
        }
      } catch (err) {
        console.error("Erro ao carregar dados da nuvem:", err);
        setCloudReadFailed(true);
        loadFromLocalStorage();
      } finally {
        setIsLoading(false);
        setIsDataLoaded(true);
      }
    }
    loadData();
  }, []);

  // Estado de autenticação vem do Supabase Auth — nunca do localStorage.
  // A sessão é um JWT assinado pelo Supabase; as políticas RLS reavaliam
  // esse token no servidor a cada gravação.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);

  // Modo de teste local (?dev). Libera a edição sem sessão, mas nunca grava na
  // nuvem — as alterações ficam só no localStorage deste navegador.
  const [devPreview] = useState(() => isDevPreview());

  useEffect(() => {
    if (!devPreview) return;
    setIsEditMode(true);
  }, [devPreview]);

  useEffect(() => {
    return observeAuth((user) => {
      const signedIn = user !== null;
      setIsAuthenticated(signedIn);
      setIsAuthReady(true);
      if (signedIn) {
        // Restaura a preferência de modo de edição da sessão anterior.
        setIsEditMode(localStorage.getItem(EDIT_MODE_KEY) === "true");
      } else {
        setIsEditMode(devPreview);
        setSaveError(null);
        setIsSaving(false); // descarta um salvamento pendente interrompido pelo logout
      }
    });
  }, [devPreview]);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isImageBankOpen, setIsImageBankOpen] = useState(false);
  const [isAdminManagementOpen, setIsAdminManagementOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [showAutoSaveBanner, setShowAutoSaveBanner] = useState(false);
  const [isGlobalCollapsed, setIsGlobalCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Última versão confirmada na nuvem, para não regravar dados idênticos.
  const lastSyncedRef = useRef<string | null>(null);
  // Carimbo `updated_at` da linha lida. Vai em cada gravação para detectar que
  // outra aba escreveu no meio-tempo, em vez de sobrescrever cegamente.
  const cloudVersionRef = useRef<string | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Router hooks for URL deep linking and SPA routes
  const location = useLocation();
  const navigate = useNavigate();

  // O idioma vem da URL (`/en/...` = inglês), não de uma preferência salva:
  // assim cada página é compartilhável e indexável no idioma do link. Todo o
  // roteamento abaixo continua raciocinando em caminhos em português, que é o
  // que `routePath` guarda.
  const { language, path: routePath } = stripLocale(location.pathname);
  const setLanguage = (lang: Language) => {
    navigate(switchLanguagePath(location.pathname, lang) + location.search + location.hash);
  };

  // Scroll direction detection for global bar collapse (> 120px)
  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const currentY = window.scrollY;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        setIsGlobalCollapsed(false);
        return;
      }
      if (currentY > 120 && currentY > lastY + 6) {
        setIsGlobalCollapsed(true);
      } else if (currentY < lastY - 6 || currentY <= 120) {
        setIsGlobalCollapsed(false);
      }
      lastY = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Open login modal when visiting /admin if not authenticated.
  // Espera o Supabase resolver a sessão para não piscar o modal em quem já está logado.
  useEffect(() => {
    if (routePath === "/admin" && isAuthReady && !isAuthenticated) {
      setIsLoginModalOpen(true);
    }
  }, [routePath, isAuthReady, isAuthenticated]);

  // Rotas de edição em página. Ficam antes das demais porque `/admin/posts/x`
  // não deve ser interpretado como a página pública de posts.
  const postEditorMatch = routePath.match(/^\/admin\/posts\/(.+)$/);
  const projectEditorMatch = routePath.match(/^\/admin\/projetos\/(.+)$/);
  const adminHubMatch = routePath.match(/^\/admin\/painel(?:\/([^/]+))?\/?$/);
  const adminHubTab: AdminHubTab = ADMIN_HUB_TABS.includes(adminHubMatch?.[1] as AdminHubTab)
    ? (adminHubMatch![1] as AdminHubTab)
    : "tarefas";
  const isEditorRoute = Boolean(postEditorMatch || projectEditorMatch || adminHubMatch);

  const isBlog = !isEditorRoute && routePath.startsWith("/blog");
  const isProjects = !isEditorRoute && (routePath.startsWith("/projetos") || routePath.startsWith("/project"));
  const activePage: "cv" | "projetos" | "blog" = isBlog ? "blog" : isProjects ? "projetos" : "cv";

  // Navega mantendo o idioma atual da URL.
  const go = (canonicalPath: string) => navigate(localePath(canonicalPath, language));

  let selectedBlogPostId: string | null = null;
  if (isBlog) {
    const match = routePath.match(/^\/blog\/(.+)$/);
    if (match && match[1]) {
      selectedBlogPostId = decodeURIComponent(match[1]);
    }
  }

  let selectedProjectId: string | null = null;
  if (isProjects) {
    const match = routePath.match(/^\/(?:project|projetos)\/(.+)$/);
    if (match && match[1]) {
      selectedProjectId = decodeURIComponent(match[1]);
    }
  }

  const handleSelectBlogPost = (postId: string | null) => {
    if (postId) {
      go(`/blog/${encodeURIComponent(postId)}`);
    } else {
      go("/blog");
    }
  };

  const handleSelectProject = (projectId: string | null) => {
    if (projectId) {
      go(`/projetos/${encodeURIComponent(projectId)}`);
    } else {
      go(isProjects ? "/projetos" : "/");
    }
  };

  const handleNavigateToBlogPost = (postId: string) => {
    go(`/blog/${encodeURIComponent(postId)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Route scroll sync
  useEffect(() => {
    if (routePath === "/projetos") {
      const projElem = document.getElementById("projetos");
      if (projElem) {
        projElem.scrollIntoView({ behavior: "smooth" });
      }
    } else if (routePath === "/curriculo" || routePath === "/") {
      if (!location.hash) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [location.pathname]);

  // Dynamic client-side document title, canonical link, and meta description synchronization
  useEffect(() => {
    const isEn = language === "en";
    const name = resumeData?.profile?.name || "Pedro Henrique Almeida";
    let title = isEn ? `${name} | Resume, Portfolio & Blog` : `${name} | Currículo, Portfólio & Blog`;
    let description = (isEn ? resumeData?.profile?.bioEn : resumeData?.profile?.bio) || resumeData?.profile?.bio || "";

    if (routePath === "/curriculo") {
      title = isEn ? `Resume | ${name}` : `Currículo | ${name}`;
      description = isEn
        ? `Academic and professional resume of ${name} — Engineering Physics at UFLA, Optics and Scientific Instrumentation.`
        : `Currículo acadêmico e profissional de ${name} - Engenharia Física UFLA, Óptica e Instrumentação Científica.`;
    } else if (routePath === "/blog") {
      title = isEn ? `Blog & Articles | ${name}` : `Blog & Artigos | ${name}`;
      description = isEn
        ? "Articles and technical notes on computational physics, ultrafast optics, instrumentation and experimental automation."
        : "Artigos e notas técnicas sobre física computacional, óptica ultrarrápida, instrumentação e automação experimental.";
    } else if (selectedBlogPostId) {
      // Rascunhos não emprestam título nem descrição para quem não está editando:
      // a página em si já os esconde, e o título da aba vazaria o mesmo conteúdo.
      const post = findBySlug(resumeData.posts, selectedBlogPostId);
      if (post && (!post.draft || isEditMode)) {
        const postTitle = isEn ? post.titleEn || post.title : post.title;
        title = isEn ? `${postTitle} | ${name}'s Blog` : `${postTitle} | Blog de ${name}`;
        description = (isEn ? post.summaryEn || post.summary : post.summary) || description;
      }
    } else if (selectedProjectId) {
      const proj = findBySlug(resumeData.projects, selectedProjectId);
      if (proj && (!proj.draft || isEditMode)) {
        const projTitle = isEn ? proj.titleEn || proj.title : proj.title;
        title = isEn ? `${projTitle} | ${name}'s Projects` : `${projTitle} | Projetos de ${name}`;
        description = (isEn ? proj.descriptionEn || proj.description : proj.description) || description;
      }
    }

    document.title = title;
    document.documentElement.lang = isEn ? "en" : "pt-BR";

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", description);
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute("href", `https://pedroazara.vercel.app${location.pathname}`);
    }

    // hreflang: aponta cada página para a sua irmã no outro idioma, para o
    // buscador entender que são traduções e não conteúdo duplicado.
    const setAlternate = (hreflang: string, href: string) => {
      let link = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "alternate");
        link.setAttribute("hreflang", hreflang);
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
    };
    const base = "https://pedroazara.vercel.app";
    setAlternate("pt-BR", `${base}${localePath(routePath, "pt")}`);
    setAlternate("en", `${base}${localePath(routePath, "en")}`);
    setAlternate("x-default", `${base}${localePath(routePath, "pt")}`);
  }, [location.pathname, routePath, selectedBlogPostId, selectedProjectId, resumeData, language, isEditMode]);

  // Cópia local: gravada imediatamente a cada alteração.
  useEffect(() => {
    if (!isDataLoaded) return; // Prevent overwriting during initialization
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
  }, [resumeData, isDataLoaded]);

  // Backup completo (conteúdo + imagens) uma vez por dia, no máximo, quando o
  // admin loga. `maybeRunDailyFullBackup` já decide sozinha se já rodou hoje;
  // a ref aqui só evita disparar de novo a cada edição nesta mesma sessão.
  const dailyFullBackupTriggeredRef = useRef(false);
  useEffect(() => {
    if (!isDataLoaded || !isAuthenticated || dailyFullBackupTriggeredRef.current) return;
    dailyFullBackupTriggeredRef.current = true;
    maybeRunDailyFullBackup(resumeData);
  }, [isDataLoaded, isAuthenticated, resumeData]);

  // Cópia na nuvem: agrupada por debounce, para que uma sequência de digitação
  // gere uma única gravação no Supabase em vez de uma por tecla.
  useEffect(() => {
    if (!isDataLoaded || !isAuthenticated || cloudReadFailed) return;

    const serialized = JSON.stringify(resumeData);
    if (lastSyncedRef.current === null) {
      // Primeira passagem após o carregamento: ainda não houve edição.
      lastSyncedRef.current = serialized;
      return;
    }
    if (lastSyncedRef.current === serialized) return;

    setIsSaving(true);
    const timer = setTimeout(async () => {
      try {
        cloudVersionRef.current = await saveResumeData(resumeData, cloudVersionRef.current);
        lastSyncedRef.current = serialized;
        setSaveError(null);
        setShowAutoSaveBanner(true);
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setShowAutoSaveBanner(false), 1500);
      } catch (err) {
        console.error("Erro ao salvar dados na nuvem:", err);
        if (err instanceof StaleWriteError) {
          // Outra aba gravou depois desta carregar. Não sobrescrevemos: seria
          // apagar o trabalho dela. Recarregar traz a versão nova.
          setSaveError(
            "Outra aba salvou alterações mais recentes. Recarregue a página para continuar a partir delas — o que você digitou aqui está guardado neste navegador."
          );
        } else {
          setSaveError("Não foi possível salvar na nuvem. Suas alterações continuam guardadas neste navegador.");
        }
      } finally {
        setIsSaving(false);
      }
    }, CLOUD_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [resumeData, isDataLoaded, isAuthenticated, cloudReadFailed]);

  // Se a leitura inicial da nuvem falhou, a gravação fica bloqueada nesta sessão.
  // O admin precisa saber disso — caso contrário editaria achando que está salvando.
  useEffect(() => {
    if (isAuthenticated && cloudReadFailed) {
      setSaveError("Não foi possível ler os dados da nuvem. As edições estão sendo guardadas só neste navegador — recarregue a página para tentar de novo.");
    }
  }, [isAuthenticated, cloudReadFailed]);

  // Limpa o timer do aviso de salvamento ao desmontar.
  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  // Guarda a preferência de modo de edição (só faz sentido para o admin logado).
  useEffect(() => {
    if (!isAuthenticated) return;
    localStorage.setItem(EDIT_MODE_KEY, isEditMode.toString());
  }, [isEditMode, isAuthenticated]);

  const handleLoginSuccess = () => {
    // O estado de autenticação em si vem do observador do Supabase Auth.
    // Aqui só ativamos o modo de edição logo após entrar.
    localStorage.setItem(EDIT_MODE_KEY, "true");
    setIsEditMode(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Erro ao encerrar a sessão:", err);
    }
    localStorage.setItem(EDIT_MODE_KEY, "false");
  };


  // --- Handlers ---
  const handleUpdateProfile = (updatedProfile: Profile) => {
    setResumeData((prev) => ({ ...prev, profile: updatedProfile }));
  };

  /**
   * Salva os projetos e leva junto quem os menciona pelo código.
   *
   * Artigos, experiências e atividades guardam o projeto pelo `codigo` — o
   * mesmo trecho que aparece no link. Como esse endereço passou a ser
   * editável, renomear um projeto deixaria essas listas apontando para um
   * código que não existe mais, e a menção sumiria da tela sem aviso.
   */
  const handleUpdateProjects = (updatedProjects: Project[]) => {
    setResumeData((prev) => {
      const renomeados = new Map<string, string>();
      prev.projects.forEach((antigo) => {
        const novo = updatedProjects.find((p) => p.id === antigo.id);
        if (!novo) return;
        const de = antigo.codigo || antigo.id;
        const para = novo.codigo || novo.id;
        if (de !== para) renomeados.set(de, para);
      });

      if (renomeados.size === 0) return { ...prev, projects: updatedProjects };

      const seguir = (codigos?: string[]) =>
        codigos ? codigos.map((codigo) => renomeados.get(codigo) ?? codigo) : codigos;

      return {
        ...prev,
        projects: updatedProjects,
        posts: (prev.posts || []).map((post) => ({ ...post, projetos: seguir(post.projetos) })),
        experiences: prev.experiences.map((exp) => ({ ...exp, projetos: seguir(exp.projetos) })),
        academicActivities: prev.academicActivities?.map((ativ) => ({
          ...ativ,
          projetos: seguir(ativ.projetos),
        })),
      };
    });
  };

  const handleUpdateCategories = (updatedCategories: ProjectCategory[]) => {
    setResumeData((prev) => ({ ...prev, categories: updatedCategories }));
  };

  const handleUpdateExperiences = (updatedExp: Experience[]) => {
    setResumeData((prev) => ({ ...prev, experiences: updatedExp }));
  };

  const handleUpdateAcademicActivities = (updatedAct: AcademicActivity[]) => {
    setResumeData((prev) => ({ ...prev, academicActivities: updatedAct }));
  };

  const handleUpdateEducations = (updatedEdu: Education[]) => {
    setResumeData((prev) => ({ ...prev, educations: updatedEdu }));
  };

  const handleUpdateSkills = (updatedSkills: Skill[]) => {
    setResumeData((prev) => ({ ...prev, skills: updatedSkills }));
  };

  const handleUpdateSkillCategories = (updatedCategories: SkillCategory[]) => {
    setResumeData((prev) => ({ ...prev, skillCategories: updatedCategories }));
  };

  const handleUpdateCourses = (updatedCourses: Course[]) => {
    setResumeData((prev) => ({ ...prev, courses: updatedCourses }));
  };

  const handleUpdatePosts = (updatedPosts: BlogPost[]) => {
    setResumeData((prev) => ({ ...prev, posts: updatedPosts }));
  };

  const handleResetToTemplate = () => {
    setResumeData(initialResumeData);
  };

  const handleClearAll = () => {
    setResumeData({
      profile: {
        name: "",
        title: "",
        bio: "",
        email: "",
        phone: "",
        location: "",
      },
      categories: [],
      projects: [],
      experiences: [],
      educations: [],
      skills: [],
      courses: [],
    });
  };

  const handleImportJSON = (imported: ResumeData) => {
    setResumeData(imported);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-5 shadow-xl shadow-indigo-100/50 dark:shadow-none border border-indigo-100/50 dark:border-indigo-900/40">
            <OrbitaIcon size={44} color="currentColor" className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
          </div>
          <h2 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-200 font-sans">
            Carregando site
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white print:bg-white print:p-0 transition-colors duration-300">
      {/* Skip Link for Accessibility */}
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-xl focus:outline-hidden"
      >
        {language === "en" ? "Skip to main content" : "Ir para o conteúdo principal"}
      </a>

      {/* Top Decoration Line */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 no-print print:hidden" />

      {/* Admin Strip (Visible ONLY when authenticated) */}
      {isAuthenticated && (
        <AdminStrip
          isEditMode={isEditMode}
          onToggleEditMode={() => setIsEditMode(!isEditMode)}
          isSaving={isSaving}
          showAutoSaveBanner={showAutoSaveBanner}
          language={language}
          onLogout={handleLogout}
          onOpenManagement={() => setIsAdminManagementOpen(true)}
        />
      )}

      {/* Global Navigation Header (64px, scroll-hiding) */}
      <GlobalHeader
        isCollapsed={isGlobalCollapsed}
        language={language}
        onLanguageChange={setLanguage}
        darkMode={darkMode}
        onDarkModeToggle={() => setDarkMode(!darkMode)}
        isAuthenticated={isAuthenticated}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenPdfPreview={() => setIsPdfPreviewOpen(true)}
        resumeData={resumeData}
        badgeIconUrl={resumeData.profile.badgeIconUrl}
        authorName={resumeData.profile.name || "Pedro Henrique Almeida"}
        authorTitle={(language === "en" ? resumeData.profile.titleEn : resumeData.profile.title) || (language === "en" ? "Engineering Physics" : "Engenharia Física")}
      />

      {/* Main Content Area */}
      <main id="conteudo-principal" className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8 lg:px-12 print:p-0 print:max-w-none focus:outline-hidden">
        {isEditorRoute ? (
          /* Editores em página dedicada. Exigem sessão ativa: sem ela, mostramos
             o aviso em vez do formulário — as políticas RLS recusariam a gravação
             de qualquer forma, e é melhor dizer isso antes de a pessoa digitar. */
          !isAuthReady ? (
            <div className="py-20 text-center text-sm text-slate-400">
              {language === "en" ? "Checking session…" : "Verificando sessão…"}
            </div>
          ) : !(isAuthenticated || devPreview) ? (
            <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
              <Lock className="mx-auto mb-3 h-9 w-9 text-slate-300 dark:text-slate-700" />
              <h1 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {language === "en" ? "Sign in to edit" : "Entre para editar"}
              </h1>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
              >
                {language === "en" ? "Sign in" : "Entrar"}
              </button>
            </div>
          ) : adminHubMatch ? (
            <AdminHubPage tab={adminHubTab} />
          ) : postEditorMatch ? (
            <PostEditorPage
              slug={decodeURIComponent(postEditorMatch[1])}
              posts={resumeData.posts || []}
              onUpdatePosts={handleUpdatePosts}
              language={language}
            />
          ) : (
            <ProjectEditorPage
              slug={decodeURIComponent(projectEditorMatch![1])}
              projects={resumeData.projects}
              categories={resumeData.categories}
              onUpdateProjects={handleUpdateProjects}
              onUpdateCategories={handleUpdateCategories}
              language={language}
            />
          )
        ) : activePage === "cv" ? (
          /* High-Fidelity Active Resume / Portfolio View */
          <div className="space-y-8 print:space-y-6">
            
            {/* Header Profile Section */}
            <ResumeHeader
              profile={resumeData.profile}
              isEditMode={isEditMode}
              onUpdateProfile={handleUpdateProfile}
              language={language}
            />

            {/* Academic Background & Research Experience Sections */}
            <ExperienceEducationSection
              experiences={resumeData.experiences}
              academicActivities={resumeData.academicActivities || []}
              educations={resumeData.educations}
              projects={resumeData.projects}
              isEditMode={isEditMode}
              onUpdateExperiences={handleUpdateExperiences}
              onUpdateAcademicActivities={handleUpdateAcademicActivities}
              onUpdateEducations={handleUpdateEducations}
              language={language}
            />

            {/* Project Showcase Section grouped by Different Areas */}
            <ProjectSection
              projects={resumeData.projects}
              categories={resumeData.categories}
              isEditMode={isEditMode}
              onUpdateProjects={handleUpdateProjects}
              onUpdateCategories={handleUpdateCategories}
              posts={resumeData.posts || []}
              onNavigateToBlogPost={handleNavigateToBlogPost}
              language={language}
              selectedProjectId={selectedProjectId}
              onSelectProject={handleSelectProject}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Courses & Certifications Section */}
            <CoursesSection
              courses={resumeData.courses || []}
              isEditMode={isEditMode}
              onUpdateCourses={handleUpdateCourses}
              language={language}
            />

            {/* Skillset Matrix Section */}
            <SkillsSection
              skills={resumeData.skills}
              skillCategories={resumeData.skillCategories || []}
              isEditMode={isEditMode}
              onUpdateSkills={handleUpdateSkills}
              onUpdateSkillCategories={handleUpdateSkillCategories}
              language={language}
            />
          </div>
        ) : activePage === "projetos" ? (
          /* Com um projeto na URL, os detalhes ocupam a página inteira; sem ele,
             a grade. Antes os detalhes abriam num modal sobre a grade. */
          selectedProjectId ? (
            <ProjectPage
              slug={selectedProjectId}
              projects={resumeData.projects}
              categories={resumeData.categories}
              posts={resumeData.posts || []}
              isEditMode={isEditMode}
              language={language}
            />
          ) : (
            <ProjectSection
              projects={resumeData.projects}
              categories={resumeData.categories}
              isEditMode={isEditMode}
              onUpdateProjects={handleUpdateProjects}
              onUpdateCategories={handleUpdateCategories}
              posts={resumeData.posts || []}
              onNavigateToBlogPost={handleNavigateToBlogPost}
              language={language}
              selectedProjectId={null}
              onSelectProject={handleSelectProject}
              isStandalonePage={true}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )
        ) : (
          /* Blog / Publications Page Section */
          /* Com um artigo na URL, a leitura ocupa a página inteira; sem ele,
             mostramos a listagem. Antes o artigo abria sobreposto à lista. */
          selectedBlogPostId ? (
            <PostPage
              slug={selectedBlogPostId}
              posts={resumeData.posts || []}
              projects={resumeData.projects}
              authorName={resumeData.profile.name || "Pedro Henrique Almeida"}
              isEditMode={isEditMode}
              language={language}
            />
          ) : (
            <BlogSection
              posts={resumeData.posts || []}
              projects={resumeData.projects}
              isEditMode={isEditMode}
              onUpdatePosts={handleUpdatePosts}
              authorName={resumeData.profile.name || "Pedro Henrique Almeida"}
              selectedPostId={selectedBlogPostId}
              onSelectPost={handleSelectBlogPost}
              language={language}
              searchQuery={searchQuery}
            />
          )
        )}
      </main>

      {/* Footer Design */}
      <Footer
        profile={resumeData.profile}
        language={language}
        onOpenPdfPreview={() => setIsPdfPreviewOpen(true)}
      />

      {/* Faixa do modo de teste. O `import.meta.env.DEV` vira `false` literal no
          build de produção, e o minificador elimina o bloco inteiro — sem ele,
          o JSX continuaria no bundle publicado, ainda que nunca renderizasse. */}
      {import.meta.env.DEV && devPreview && (
        <div className="fixed bottom-4 left-4 z-100 flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-100 px-4 py-2.5 text-xs font-bold text-amber-900 shadow-lg dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 no-print">
          <Atom className="h-4 w-4 shrink-0" />
          <span>
            Modo de teste — edição liberada sem login, sem gravar na nuvem.{" "}
            <a href="?dev=0" className="underline">
              sair
            </a>
          </span>
        </div>
      )}

      {/* Aviso persistente de falha de salvamento na nuvem */}
      <AnimatePresence>
        {isAuthenticated && saveError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            role="status"
            className="fixed bottom-4 left-1/2 z-100 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 shadow-xl dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-200 no-print"
          >
            <CloudOff className="h-4 w-4 shrink-0" />
            <span className="max-w-xs">{saveError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal for Admin Access */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Image Bank Modal */}
      <ImageBankModal
        isOpen={isImageBankOpen}
        onClose={() => setIsImageBankOpen(false)}
      />

      {/* Admin Management Modal (backups, security, media, advanced) */}
      <AdminManagementModal
        isOpen={isAdminManagementOpen}
        onClose={() => setIsAdminManagementOpen(false)}
        resumeData={resumeData}
        onRestore={handleImportJSON}
        onResetToTemplate={handleResetToTemplate}
        onClearAll={handleClearAll}
        onOpenImageBank={() => setIsImageBankOpen(true)}
        onOpenPdfPreview={() => setIsPdfPreviewOpen(true)}
        language={language}
      />

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        resumeData={resumeData}
        language={language}
      />
    </div>
  );
}
