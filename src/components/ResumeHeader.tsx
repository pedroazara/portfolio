import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Profile } from "../types";
import { Mail, Phone, MapPin, Globe, Github, Linkedin, Twitter, Edit3, Camera, Download, FileText, ArrowRight } from "lucide-react";
import EditModal from "./EditModal";
import { motion, AnimatePresence } from "motion/react";
import LocalImage from "./LocalImage";
import ImageSelectorInput from "./ImageSelectorInput";
import { Language, translations } from "../lib/translations";
import TranslateButton from "./TranslateButton";
import { autoTranslateFields } from "../lib/translator";
import { SECTION_CARD_CLASS } from "../lib/cardStyle";
import { localePath } from "../lib/routes";

interface ResumeHeaderProps {
  profile: Profile;
  isEditMode: boolean;
  onUpdateProfile: (updatedProfile: Profile) => void;
  language?: Language;
  isAuthenticated?: boolean;
  onOpenPdfPreview?: () => void;
  /** Contagens do próprio currículo, exibidas como resumo do trabalho. */
  stats?: { projetos: number; pesquisa: number; habilidades: number };
}

export default function ResumeHeader({
  profile,
  isEditMode,
  onUpdateProfile,
  language = "pt",
  isAuthenticated = false,
  onOpenPdfPreview,
  stats,
}: ResumeHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Profile>({ ...profile });
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");

  // Update form data if profile prop changes
  React.useEffect(() => {
    setFormData({ ...profile });
  }, [profile]);

  const handleOpenEdit = () => {
    setEditingLanguage(language);
    setIsModalOpen(true);
  };

  const handleCopyEmail = () => {
    if (!profile.email) return;
    navigator.clipboard.writeText(profile.email).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutoTranslateProfile = async () => {
    await autoTranslateFields(
      {
        titleEn: formData.title || "",
        bioEn: formData.bio || "",
      },
      setFormData
    );

    setEditingLanguage("en");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsModalOpen(false);
  };

  return (
    <section id="perfil" className={`mb-8 lg:p-12 ${SECTION_CARD_CLASS}`}>
      {/* Luz de fundo. Só decoração: fica fora da leitura de tela e do papel.
          A abertura recebe mais do que as outras seções — é a primeira coisa
          que se vê, e o halo do canto sozinho não sustentaria a página. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 no-print print:hidden">
        <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/20" />
        <div className="absolute -bottom-44 -left-28 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15" />
      </div>
      {/* Edit Trigger (Only visible in edit mode, hidden in prints) */}
      {isEditMode && (
        <button
          onClick={handleOpenEdit}
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 shadow-xs transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 no-print print:hidden cursor-pointer"
          id="edit-profile-btn"
        >
          <Edit3 className="h-4 w-4" />
          {/* No celular o rótulo cobriria o retrato, que agora começa no topo. */}
          <span className="hidden sm:inline">{translations[language].editProfile}</span>
        </button>
      )}

      <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12">
        {/* Retrato. Vem primeiro no HTML para abrir a página no celular, e vai
            para a direita no desktop, onde o texto merece a margem de leitura. */}
        <div className="relative md:order-2">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/25 via-blue-500/20 to-transparent blur-2xl no-print print:hidden" />
          <div className="relative h-36 w-36 overflow-hidden rounded-[1.75rem] bg-slate-50 dark:bg-slate-950 border-4 border-white dark:border-slate-800 shadow-xl ring-1 ring-slate-200/70 dark:ring-slate-700/60 sm:h-44 sm:w-44 md:h-52 md:w-52 lg:h-60 lg:w-60 print-border">
            {profile.avatarUrl ? (
              <LocalImage
                src={profile.avatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name)}`}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-5xl font-black text-indigo-600 dark:text-indigo-400 font-display sm:text-6xl">
                {profile.name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="min-w-0 md:order-1">
          <h1 className="font-display text-4xl font-black leading-[0.95] tracking-tighter text-balance text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            {profile.name || "Seu Nome Completo"}
          </h1>

          {/* Barra de acento: fecha o nome e ancora a coluna no desktop. */}
          <div className="mt-5 h-1 w-16 rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-indigo-500 dark:to-blue-400" />

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 print-break-inside-avoid">
            {(language === "en" ? profile.bioEn : profile.bio) || profile.bio || (language === "en" ? "Write a short bio..." : "Escreva uma breve apresentação...")}
          </p>

          {/* Contact Details Grid */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-sm text-slate-500 dark:text-slate-400">
            {profile.email && (
              <div className="relative flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-slate-500 dark:text-slate-500 shrink-0" />
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate cursor-pointer text-left focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 focus:outline-offset-2 rounded-xs"
                  aria-label={language === "en" ? "Copy email" : "Copiar e-mail de contato"}
                  title="Clique para copiar e-mail"
                >
                  {profile.email}
                </button>
                <AnimatePresence>
                  {copiedEmail && (
                    <motion.span
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute -top-9 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 z-50 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-200"
                    >
                      {translations[language].copiedEmail}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="truncate">{profile.phone}</span>
              </div>
            )}
            {profile.location && (
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="truncate">{profile.location}</span>
              </div>
            )}
          </div>

          {/* Social / Academic Links Bar */}
          {(profile.github || profile.linkedin || profile.lattesUrl || profile.orcidUrl || profile.twitter) && (
            <div className="mt-5 flex flex-wrap gap-3 no-print print:hidden">
              {profile.github && (
                <a
                  href={profile.github.startsWith("http") ? profile.github : `https://github.com/${profile.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <Github className="h-3.5 w-3.5" />
                  GitHub
                </a>
              )}
              {profile.linkedin && (
                <a
                  href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <Linkedin className="h-3.5 w-3.5 text-sky-600" />
                  LinkedIn
                </a>
              )}
              {profile.lattesUrl && (
                <a
                  href={profile.lattesUrl.startsWith("http") ? profile.lattesUrl : `https://${profile.lattesUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  {language === "en" ? "Lattes Curriculum" : "Currículo Lattes"}
                </a>
              )}
              {profile.orcidUrl && (
                <a
                  href={profile.orcidUrl.startsWith("http") ? profile.orcidUrl : `https://${profile.orcidUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <Globe className="h-3.5 w-3.5 text-lime-600" />
                  ORCID
                </a>
              )}
              {profile.twitter && (
                <a
                  href={profile.twitter.startsWith("http") ? profile.twitter : `https://twitter.com/${profile.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <Twitter className="h-3.5 w-3.5" />
                  Twitter
                </a>
              )}
            </div>
          )}

          {/* Ações da abertura.

              Baixar o currículo é a razão de existir da página, e o botão vivia
              atrás de `isAuthenticated` — que o App nem passava, então ele nunca
              aparecia para ninguém. Agora é público, e ao lado dele o caminho
              para o trabalho em si. */}
          <div className="mt-6 flex flex-wrap items-center gap-3 no-print print:hidden">
            <button
              type="button"
              onClick={() => {
                if (onOpenPdfPreview) {
                  onOpenPdfPreview();
                  return;
                }
                // Sem a prévia em PDF, a impressão do navegador dá conta: a
                // folha já está formatada em A4 pela folha de estilo.
                const originalTitle = document.title;
                document.title = `${profile.name || "Curriculo"} - CV`;
                window.print();
                setTimeout(() => {
                  document.title = originalTitle;
                }, 1000);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 active:scale-95 cursor-pointer"
              id="hero-download-cv-btn"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>{language === "en" ? "Download CV (PDF)" : "Baixar currículo (PDF)"}</span>
            </button>

            <Link
              to={localePath("/projetos", language)}
              className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
            >
              <span>{language === "en" ? "See the projects" : "Ver os projetos"}</span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Números do próprio currículo: o que já foi feito, antes de rolar. */}
          {stats && (
            <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
              {[
                { valor: stats.projetos, pt: "projetos publicados", en: "published projects" },
                { valor: stats.pesquisa, pt: "vínculos de pesquisa", en: "research positions" },
                { valor: stats.habilidades, pt: "habilidades mapeadas", en: "mapped skills" },
              ]
                .filter((item) => item.valor > 0)
                .map((item) => (
                  <div key={item.pt}>
                    <dt className="font-display text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                      {item.valor}
                    </dt>
                    <dd className="font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === "en" ? item.en : item.pt}
                    </dd>
                  </div>
                ))}
            </dl>
          )}

          {/* Social Icons for Print (Shown as text in standard print) */}
          <div className="hidden print:flex flex-col gap-1 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-mono">
            {profile.github && <div><span className="font-semibold">GitHub:</span> {profile.github}</div>}
            {profile.linkedin && <div><span className="font-semibold">LinkedIn:</span> {profile.linkedin}</div>}
            {profile.lattesUrl && <div><span className="font-semibold">Lattes:</span> {profile.lattesUrl}</div>}
            {profile.orcidUrl && <div><span className="font-semibold">ORCID:</span> {profile.orcidUrl}</div>}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={translations[language].editProfile} size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Editing Language Toggle */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700 font-sans">
                {language === "en" ? "Language under Editing" : "Idioma em Edição"}
              </p>
              <p className="text-[10px] text-slate-500 font-sans">
                {language === "en" 
                  ? "Toggle to specify contents in Portuguese or English" 
                  : "Alterne para preencher as informações em Português ou Inglês"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0 font-sans">
              <TranslateButton
                onTranslate={handleAutoTranslateProfile}
                label={language === "en" ? "Auto-Translate PT → EN" : "Traduzir PT → EN (Gemini AI)"}
                size="sm"
              />
              <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditingLanguage("pt")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    editingLanguage === "pt"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  PT
                </button>
                <button
                  type="button"
                  onClick={() => setEditingLanguage("en")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    editingLanguage === "en"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {translations[language].fullName}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {translations[language].locationCity}
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {editingLanguage === "pt" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  {translations[language].jobTitle} (Português) *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  {translations[language].aboutYou} (Português) *
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  {translations[language].jobTitle} (English) *
                </label>
                <input
                  type="text"
                  name="titleEn"
                  value={formData.titleEn || ""}
                  onChange={handleChange}
                  required
                  placeholder="Engineering Physics Student | ..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  {translations[language].aboutYou} (English) *
                </label>
                <textarea
                  name="bioEn"
                  value={formData.bioEn || ""}
                  onChange={handleChange}
                  rows={4}
                  required
                  placeholder="Engineering Physics student passionate about..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {translations[language].email}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {translations[language].phone}
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ImageSelectorInput
              label={translations[language].profilePic}
              value={formData.avatarUrl || ""}
              onChange={(val) => setFormData({ ...formData, avatarUrl: val })}
              placeholder="https://images.unsplash.com/..."
              id="avatarUrl"
            />
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {translations[language].personalWeb}
              </label>
              <input
                type="url"
                name="website"
                value={formData.website || ""}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {translations[language].githubLabel}
              </label>
              <input
                type="text"
                name="github"
                value={formData.github || ""}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {translations[language].linkedinLabel}
              </label>
              <input
                type="text"
                name="linkedin"
                value={formData.linkedin || ""}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {translations[language].twitterLabel}
              </label>
              <input
                type="text"
                name="twitter"
                value={formData.twitter || ""}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {translations[language].lattesLabel}
              </label>
              <input
                type="url"
                name="lattesUrl"
                value={formData.lattesUrl || ""}
                onChange={handleChange}
                placeholder="http://lattes.cnpq.br/..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {translations[language].orcidLabel}
              </label>
              <input
                type="url"
                name="orcidUrl"
                value={formData.orcidUrl || ""}
                onChange={handleChange}
                placeholder="https://orcid.org/..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {translations[language].siteRepoLabel}
              </label>
              <input
                type="url"
                name="siteRepoUrl"
                value={formData.siteRepoUrl || ""}
                onChange={handleChange}
                placeholder="https://github.com/..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {translations[language].cancel}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
            >
              {translations[language].saveChangesBtn}
            </button>
          </div>
        </form>
      </EditModal>
    </section>
  );
}
