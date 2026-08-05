import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ResumeData, Profile, Project, ProjectCategory, Experience, Education, Skill, Course, BlogPost } from "./types";
import { initialResumeData } from "./data/initialData";
import ResumeHeader from "./components/ResumeHeader";
import ProjectSection from "./components/ProjectSection";
import ExperienceEducationSection from "./components/ExperienceEducationSection";
import CoursesSection from "./components/CoursesSection";
import SkillsSection from "./components/SkillsSection";
import PortfolioControls from "./components/PortfolioControls";
import BlogSection from "./components/BlogSection";
import LoginModal from "./components/LoginModal";
import ImageBankModal from "./components/ImageBankModal";
import ChangePasswordModal from "./components/ChangePasswordModal";
import LocalImage from "./components/LocalImage";
import { Orbita } from "./components/WaveIcon";
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
      avatarUrl: data?.profile?.avatarUrl ?? initialResumeData.profile.avatarUrl ?? "",
    },
    categories: Array.isArray(data?.categories) ? data.categories : (initialResumeData.categories || []),
    projects: Array.isArray(data?.projects) ? data.projects : (initialResumeData.projects || []),
    experiences: Array.isArray(data?.experiences) ? data.experiences : (initialResumeData.experiences || []),
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
  const [showAutoSaveBanner, setShowAutoSaveBanner] = useState(false);

  // Router hooks for URL deep linking and SPA routes
  const location = useLocation();
  const navigate = useNavigate();

  const isBlog = location.pathname.startsWith("/blog");
  const activePage: "cv" | "blog" = isBlog ? "blog" : "cv";

  let selectedBlogPostId: string | null = null;
  if (isBlog) {
    const match = location.pathname.match(/^\/blog\/(.+)$/);
    if (match && match[1]) {
      selectedBlogPostId = decodeURIComponent(match[1]);
    }
  }

  let selectedProjectId: string | null = null;
  if (!isBlog) {
    const match = location.pathname.match(/^\/project\/(.+)$/);
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
      navigate("/");
    }
  };

  const handleNavigateToBlogPost = (postId: string) => {
    navigate(`/blog/${encodeURIComponent(postId)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-6 shadow-xl shadow-indigo-100/50 dark:shadow-none">
            <Atom className="h-8 w-8 animate-spin-slow text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
            {language === "en" ? "Syncing Portfolio" : "Sincronizando Portfólio"}
          </h2>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-sans leading-relaxed">
            {language === "en" 
              ? "Connecting to Firebase to fetch the latest CV details..." 
              : "Conectando ao Firebase para obter os dados mais recentes..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white print:bg-white print:p-0 transition-colors duration-300">
      {/* Top Decoration Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 no-print print:hidden" />

      {/* Main Container */}
      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8 lg:px-12 print:p-0 print:max-w-none">
        
        {/* Personal Navigation Header */}
        <header className="no-print print:hidden mb-8 border-b border-slate-200/60 dark:border-slate-800/80 pb-6">
          {/* Row 1: Profile & Auto-Save Banner */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white overflow-hidden p-0.5">
                {resumeData.profile.badgeIconUrl ? (
                  <LocalImage
                    src={resumeData.profile.badgeIconUrl}
                    alt="Badge Icon"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Orbita size={44} color="#ffffff" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display truncate">
                  {resumeData.profile.name || "Pedro Henrique Almeida"}
                </h1>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 font-mono tracking-wider uppercase leading-relaxed mt-0.5">
                  {(language === "en" ? resumeData.profile.titleEn : resumeData.profile.title) || (language === "en" ? "Engineering Physics" : "Engenharia Física")}
                </p>
              </div>
            </div>

            {/* Auto-Save & Cloud Sync indicator on the right side of profile row */}
            <div className="flex items-center md:justify-end gap-1.5 self-start md:self-auto h-7">
              <AnimatePresence>
                {isSaving && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50"
                  >
                    <Cloud className="h-3 w-3 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                    <span>{language === "en" ? "Syncing..." : "Salvando..."}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showAutoSaveBanner && !isSaving && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{translations[language].saved}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Row 2: Unified Navigation (left) & Settings / Panel trigger (right) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            {/* Primary Page Navigation Tabs */}
            <nav className="flex rounded-2xl bg-slate-100 dark:bg-slate-900 p-1.5 gap-1 shadow-xs border border-slate-200/50 dark:border-slate-800 self-start">
              <button
                onClick={() => navigate("/")}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  activePage === "cv" && !selectedBlogPostId
                    ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-950 dark:hover:text-slate-100"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>{translations[language].cv}</span>
              </button>
              <button
                onClick={() => navigate("/blog")}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  activePage === "blog"
                    ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-950 dark:hover:text-slate-100"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>{translations[language].blog}</span>
              </button>
            </nav>

            {/* Preferences (Language, Dark Mode, Admin Trigger) */}
            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              {/* Language Switcher */}
              <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 shadow-xs border border-slate-200/50 dark:border-slate-800">
                <button
                  onClick={() => setLanguage("pt")}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    language === "pt"
                      ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100"
                  }`}
                  title={translations[language].portuguese}
                >
                  PT
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    language === "en"
                      ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100"
                  }`}
                  title={translations[language].english}
                >
                  EN
                </button>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/95 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/95 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 shadow-xs dark:hover:bg-slate-800 transition-all cursor-pointer"
                title={translations[language].darkModeToggle}
                aria-label={translations[language].darkModeToggle}
              >
                {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
              </button>

              {/* Discrete Admin/Panel trigger in top navigation when not logged in */}
              {!isAuthenticated && (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-xs cursor-pointer"
                  title={translations[language].restrictedAccess}
                  id="discrete-panel-login-btn"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>{translations[language].panel}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Floating/Sticky Navigation Control Panel - Only visible for authenticated users */}
        {isAuthenticated && (
          <PortfolioControls
            isEditMode={isEditMode}
            onToggleEditMode={() => setIsEditMode(!isEditMode)}
            onResetToTemplate={handleResetToTemplate}
            onClearAll={handleClearAll}
            onImportJSON={handleImportJSON}
            resumeData={resumeData}
            isAuthenticated={isAuthenticated}
            onLoginClick={() => setIsLoginModalOpen(true)}
            onLogout={handleLogout}
            onOpenImageBank={() => setIsImageBankOpen(true)}
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          />
        )}

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
            />

            {/* Dual Timeline (Experiences & Educations) */}
            <ExperienceEducationSection
              experiences={resumeData.experiences}
              educations={resumeData.educations}
              isEditMode={isEditMode}
              onUpdateExperiences={handleUpdateExperiences}
              onUpdateEducations={handleUpdateEducations}
              language={language}
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
        ) : (
          /* Blog / Publications Page Section */
          <BlogSection
            posts={resumeData.posts || []}
            isEditMode={isEditMode}
            onUpdatePosts={handleUpdatePosts}
            authorName={resumeData.profile.name || "Pedro Henrique Almeida"}
            selectedPostId={selectedBlogPostId}
            onSelectPost={handleSelectBlogPost}
            language={language}
          />
        )}
      </main>

      {/* Footer Design */}
      <footer className="no-print print:hidden mt-16 border-t border-slate-200 bg-white py-12 text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-slate-700 font-display">
            {resumeData.profile.name || (language === "en" ? "Your CV and Portfolio" : "Seu Currículo e Portfólio")}
          </p>
          <p className="mt-2 text-xs text-slate-400 font-sans">
            {language === "en" 
              ? "All changes are secure and automatically synchronized in the cloud in real-time via Firebase." 
              : "Todas as alterações são seguras e sincronizadas na nuvem em tempo real via Firebase."}
          </p>

          <div className="mt-4 flex justify-center gap-4 text-xs text-slate-400 font-mono">
            <span>PedroHenriqueAlmeida2004@gmail.com</span>
            <span>•</span>
            <span>{language === "en" ? "Developed with React + Tailwind CSS" : "Desenvolvido com React + Tailwind CSS"}</span>
          </div>
        </div>
      </footer>

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
    </div>
  );
}
