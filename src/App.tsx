import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ResumeData, Profile, Project, ProjectCategory, Experience, AcademicActivity, Education, Skill, Course, BlogPost } from "./types";
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
import ChangePasswordModal from "./components/ChangePasswordModal";
import PdfPreviewModal from "./components/PdfPreviewModal";
import Footer from "./components/Footer";
import LocalImage from "./components/LocalImage";
import { OrbitaIcon } from "./components/OrbitaIcon";
import { Sparkles, CheckCircle2, Lock, Atom, FileText, BookOpen, Cloud, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "./lib/translations";
import { fetchResumeData, saveResumeData } from "./lib/firebaseService";
import { listImages } from "./utils/imageDb";

const STORAGE_KEY = "curriculo_portfolio_data_v1";
const EDIT_MODE_KEY = "curriculo_portfolio_edit_mode_v1";
const AUTH_KEY = "curriculo_portfolio_auth_v1";
const LANG_KEY = "curriculo_portfolio_lang_v1";

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
      lattesUrl: data?.profile?.lattesUrl ?? initialResumeData.profile.lattesUrl ?? "",
      orcidUrl: data?.profile?.orcidUrl ?? initialResumeData.profile.orcidUrl ?? "",
      siteRepoUrl: data?.profile?.siteRepoUrl ?? initialResumeData.profile.siteRepoUrl ?? "",
      avatarUrl: data?.profile?.avatarUrl ?? initialResumeData.profile.avatarUrl ?? "",
    },
    categories: Array.isArray(data?.categories) ? data.categories : (initialResumeData.categories || []),
    projects: Array.isArray(data?.projects) ? data.projects : (initialResumeData.projects || []),
    experiences: Array.isArray(data?.experiences) ? data.experiences : (initialResumeData.experiences || []),
    academicActivities: Array.isArray(data?.academicActivities) ? data.academicActivities : (initialResumeData.academicActivities || []),
    educations: Array.isArray(data?.educations) ? data.educations : (initialResumeData.educations || []),
    skills: Array.isArray(data?.skills) ? data.skills : (initialResumeData.skills || []),
    courses: Array.isArray(data?.courses) ? data.courses : (initialResumeData.courses || []),
    posts: Array.isArray(data?.posts) ? data.posts : (initialResumeData.posts || []),
  };
};

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return (saved === "pt" || saved === "en") ? saved : "pt";
  });

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
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load initial resume state from localStorage or template
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeData);

  // Title effect handled dynamically by route meta effect below

  // Fetch initial data from Firestore or fallback to localStorage
  useEffect(() => {
    async function loadData() {
      try {
        const firestoreData = await fetchResumeData();
        if (firestoreData) {
          setResumeData(sanitizeResumeData(firestoreData));
        } else {
          // Fallback to local storage if document doesn't exist in Firestore
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            try {
              setResumeData(sanitizeResumeData(JSON.parse(saved)));
            } catch (err) {
              console.error("Erro ao ler dados salvos no LocalStorage:", err);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do Firebase:", err);
        // Fallback to local storage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            setResumeData(sanitizeResumeData(JSON.parse(saved)));
          } catch (e) {
            console.error(e);
          }
        }
      } finally {
        setIsLoading(false);
        setIsFirebaseLoaded(true);
      }
    }
    loadData();
  }, []);

  // Trigger background sync of media library/images on application startup
  useEffect(() => {
    listImages()
      .then(() => {
        console.log("Background media library synchronization completed.");
      })
      .catch((err) => {
        console.warn("Background media library synchronization failed:", err);
      });
  }, []);

  // Load authentication status
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_KEY) === "true";
  });

  // Load edit mode preference (only enabled if authenticated)
  const [isEditMode, setIsEditMode] = useState<boolean>(() => {
    const isAuth = localStorage.getItem(AUTH_KEY) === "true";
    return isAuth && localStorage.getItem(EDIT_MODE_KEY) === "true";
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isImageBankOpen, setIsImageBankOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [showAutoSaveBanner, setShowAutoSaveBanner] = useState(false);
  const [isGlobalCollapsed, setIsGlobalCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Router hooks for URL deep linking and SPA routes
  const location = useLocation();
  const navigate = useNavigate();

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

  // Open login modal when visiting /admin if not authenticated
  useEffect(() => {
    if (location.pathname === "/admin" && !isAuthenticated) {
      setIsLoginModalOpen(true);
    }
  }, [location.pathname, isAuthenticated]);

  const isBlog = location.pathname.startsWith("/blog");
  const isProjects = location.pathname.startsWith("/projetos") || location.pathname.startsWith("/project");
  const activePage: "cv" | "projetos" | "blog" = isBlog ? "blog" : isProjects ? "projetos" : "cv";

  let selectedBlogPostId: string | null = null;
  if (isBlog) {
    const match = location.pathname.match(/^\/blog\/(.+)$/);
    if (match && match[1]) {
      selectedBlogPostId = decodeURIComponent(match[1]);
    }
  }

  let selectedProjectId: string | null = null;
  if (isProjects) {
    const match = location.pathname.match(/^\/(?:project|projetos)\/(.+)$/);
    if (match && match[1]) {
      selectedProjectId = decodeURIComponent(match[1]);
    }
  }

  const handleSelectBlogPost = (postId: string | null) => {
    if (postId) {
      navigate(`/blog/${encodeURIComponent(postId)}`);
    } else {
      navigate("/blog");
    }
  };

  const handleSelectProject = (projectId: string | null) => {
    if (projectId) {
      navigate(`/project/${encodeURIComponent(projectId)}`);
    } else {
      if (isProjects) {
        navigate("/projetos");
      } else {
        navigate("/");
      }
    }
  };

  const handleNavigateToBlogPost = (postId: string) => {
    navigate(`/blog/${encodeURIComponent(postId)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Route scroll sync
  useEffect(() => {
    if (location.pathname === "/projetos") {
      const projElem = document.getElementById("projetos");
      if (projElem) {
        projElem.scrollIntoView({ behavior: "smooth" });
      }
    } else if (location.pathname === "/curriculo" || location.pathname === "/") {
      if (!location.hash) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [location.pathname]);

  // Dynamic client-side document title, canonical link, and meta description synchronization
  useEffect(() => {
    const name = resumeData?.profile?.name || "Pedro Henrique Almeida";
    let title = `${name} | Currículo, Portfólio & Blog`;
    let description = resumeData?.profile?.bio || "";

    if (location.pathname === "/curriculo") {
      title = `Currículo | ${name}`;
      description = `Currículo acadêmico e profissional de ${name} - Engenharia Física UFLA, Óptica e Instrumentação Científica.`;
    } else if (location.pathname === "/blog") {
      title = `Blog & Artigos | ${name}`;
      description = "Artigos e notas técnicas sobre física computacional, óptica ultrarrápida, instrumentação e automação experimental.";
    } else if (selectedBlogPostId) {
      const post = resumeData.posts.find((p) => p.id === selectedBlogPostId);
      if (post) {
        title = `${language === "en" ? post.titleEn || post.title : post.title} | Blog de ${name}`;
        description = (language === "en" ? post.summaryEn || post.summary : post.summary) || description;
      }
    } else if (selectedProjectId) {
      const proj = resumeData.projects.find((p) => p.id === selectedProjectId);
      if (proj) {
        title = `${language === "en" ? proj.titleEn || proj.title : proj.title} | Projetos de ${name}`;
        description = proj.description || description;
      }
    }

    document.title = title;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", description);
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute("href", `https://pedroazara.vercel.app${location.pathname}`);
    }
  }, [location.pathname, selectedBlogPostId, selectedProjectId, resumeData, language]);

  // Sync resumeData changes with LocalStorage and Firestore (if authenticated)
  useEffect(() => {
    if (!isFirebaseLoaded) return; // Prevent overwriting during initialization

    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
    
    // Quick status indicator for UX
    setShowAutoSaveBanner(true);
    const timer = setTimeout(() => {
      setShowAutoSaveBanner(false);
    }, 1500);

    // Write to Firestore if authenticated
    if (isAuthenticated) {
      setIsSaving(true);
      saveResumeData(resumeData)
        .then(() => {
          setIsSaving(false);
        })
        .catch((err) => {
          console.error("Erro ao salvar dados no Firestore:", err);
          setIsSaving(false);
        });
    }

    return () => clearTimeout(timer);
  }, [resumeData, isFirebaseLoaded, isAuthenticated]);

  // Sync edit mode with LocalStorage, ensuring it remains disabled if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setIsEditMode(false);
    } else {
      localStorage.setItem(EDIT_MODE_KEY, isEditMode.toString());
    }
  }, [isEditMode, isAuthenticated]);

  // Sync authentication with LocalStorage
  useEffect(() => {
    localStorage.setItem(AUTH_KEY, isAuthenticated.toString());
  }, [isAuthenticated]);

  // Sync language with LocalStorage
  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
  }, [language]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setIsEditMode(true); // Automatically enter edit mode upon login
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsEditMode(false);
  };


  // --- Handlers ---
  const handleUpdateProfile = (updatedProfile: Profile) => {
    setResumeData((prev) => ({ ...prev, profile: updatedProfile }));
  };

  const handleUpdateProjects = (updatedProjects: Project[]) => {
    setResumeData((prev) => ({ ...prev, projects: updatedProjects }));
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
          resumeData={resumeData}
          onResetToTemplate={handleResetToTemplate}
          onClearAll={handleClearAll}
          onImportJSON={handleImportJSON}
          onLogout={handleLogout}
          onOpenImageBank={() => setIsImageBankOpen(true)}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onOpenPdfPreview={() => setIsPdfPreviewOpen(true)}
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
        {activePage === "cv" ? (
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
              isEditMode={isEditMode}
              onUpdateSkills={handleUpdateSkills}
              language={language}
            />
          </div>
        ) : activePage === "projetos" ? (
          /* Standalone Projects & Innovations Page Section */
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
            isStandalonePage={true}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        ) : (
          /* Blog / Publications Page Section */
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
        )}
      </main>

      {/* Footer Design */}
      <Footer
        profile={resumeData.profile}
        language={language}
        onOpenPdfPreview={() => setIsPdfPreviewOpen(true)}
      />

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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
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
