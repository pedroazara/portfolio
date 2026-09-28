import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Profile } from "../types";
import { Mail, Phone, MapPin, Globe, Github, Linkedin, Twitter, Edit3, Download, FileText, Presentation } from "lucide-react";
import EditModal from "./EditModal";
import { motion, AnimatePresence } from "motion/react";
import LocalImage from "./LocalImage";
import ImageSelectorInput from "./ImageSelectorInput";
import { Language, translations } from "../lib/translations";
import TranslateButton from "./TranslateButton";
import { autoTranslateFields } from "../lib/translator";
import { localePath } from "../lib/routes";
import { paragrafos } from "../utils/paragrafos";
import SinalPulso from "./SinalPulso";

interface ResumeHeaderProps {
  profile: Profile;
  isEditMode: boolean;
  onUpdateProfile: (updatedProfile: Profile) => void;
  language?: Language;
  isAuthenticated?: boolean;
  onOpenPdfPreview?: () => void;
  /** Abre o elevator pitch direto na apresentação. Omitido, o botão não aparece. */
  onOpenElevatorPitchPresent?: () => void;
}

export default function ResumeHeader({
  profile,
  isEditMode,
  onUpdateProfile,
  language = "pt",
  isAuthenticated = false,
  onOpenPdfPreview,
  onOpenElevatorPitchPresent,
}: ResumeHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Profile>({ ...profile });
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");
  const secaoRef = useRef<HTMLElement>(null);

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

  const bioParagrafos = paragrafos(
    (language === "en" ? profile.bioEn : profile.bio) || profile.bio || (language === "en" ? "Write a short bio..." : "Escreva uma breve apresentação...")
  );
  // O título vem como "Formação | Área"; cada parte ganha a própria linha.
  const tituloPartes = ((language === "en" ? profile.titleEn : profile.title) || profile.title || "")
    .split("|")
    .map((parte) => parte.trim())
    .filter(Boolean);

  const linkClass =
    "inline-flex items-center gap-2 text-sm font-medium text-tinta underline-offset-4 transition-colors hover:text-acento-tinta hover:underline";

  return (
    <section id="perfil" ref={secaoRef} className="relative scroll-mt-32 pt-2 sm:pt-6 lg:pt-10">
      {/* Edit Trigger (Only visible in edit mode, hidden in prints) */}
      {isEditMode && (
        <button
          onClick={handleOpenEdit}
          className="absolute top-0 right-0 z-10 flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 shadow-xs transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 no-print print:hidden cursor-pointer"
          id="edit-profile-btn"
        >
          <Edit3 className="h-4 w-4" />
          {/* No celular o rótulo cobriria o retrato, que agora começa no topo. */}
          <span className="hidden sm:inline">{translations[language].editProfile}</span>
        </button>
      )}

      {/* Abertura sem cartão: o nome assenta direto no papel, e o traço de
          sinal logo abaixo faz a divisa entre quem é e o que faz. */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-12">
        {/* Retrato. Vem primeiro no HTML para abrir a página no celular, e vai
            para a direita no desktop, apoiado sobre o traço. */}
        <div className="md:order-2">
          <div className="h-24 w-24 overflow-hidden rounded-2xl bg-superficie-alta ring-1 ring-borda sm:h-28 sm:w-28 md:h-40 md:w-40 lg:h-48 lg:w-48 print-border">
            {profile.avatarUrl ? (
              <LocalImage
                src={profile.avatarUrl}
                alt={profile.name}
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 768px) 112px, 192px"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name)}`}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-acento-suave text-5xl font-black text-acento-tinta font-display">
                {profile.name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 md:order-1">
          <h1 className="font-display text-[clamp(2.6rem,7vw,5.75rem)] font-extrabold leading-[0.92] tracking-[-0.035em] text-balance text-tinta">
            {profile.name || "Seu Nome Completo"}
          </h1>
          {tituloPartes.length > 0 && (
            <p className="mt-5 text-lg leading-snug text-tinta-suave sm:text-xl">
              {tituloPartes.map((parte) => (
                <span key={parte} className="block">
                  {parte}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      {/* O traço vai de borda a borda do conteúdo: desfaz o recuo do <main>. */}
      <SinalPulso areaRef={secaoRef} className="-mx-4 mt-6 sm:-mx-8 sm:mt-8 lg:-mx-12" />

      <div className="mt-6 grid gap-10 sm:mt-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
        <Apresentacao paragrafos={bioParagrafos} />

        {/* Ficha: contato, perfis e ações — os fatos, separados da história. */}
        <div className="space-y-6 lg:border-l lg:border-borda lg:pl-10">
          {(profile.email || profile.phone || profile.location) && (
            <ul className="space-y-2.5 text-sm text-tinta-suave">
              {profile.email && (
                <li className="relative flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-tinta-fraca" />
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="truncate text-left transition-colors hover:text-acento-tinta cursor-pointer rounded-xs"
                    aria-label={language === "en" ? "Copy email" : "Copiar e-mail de contato"}
                    title={language === "en" ? "Click to copy" : "Clique para copiar e-mail"}
                  >
                    {profile.email}
                  </button>
                  <AnimatePresence>
                    {copiedEmail && (
                      <motion.span
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute -top-9 left-6 z-50 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-200 dark:shadow-none"
                      >
                        {translations[language].copiedEmail}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </li>
              )}
              {profile.phone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-tinta-fraca" />
                  <span className="truncate">{profile.phone}</span>
                </li>
              )}
              {profile.location && (
                <li className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-tinta-fraca" />
                  <span className="truncate">{profile.location}</span>
                </li>
              )}
            </ul>
          )}

          {/* Social / Academic Links Bar */}
          {(profile.github || profile.linkedin || profile.lattesUrl || profile.orcidUrl || profile.twitter) && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 no-print print:hidden">
              {profile.github && (
                <a
                  href={profile.github.startsWith("http") ? profile.github : `https://github.com/${profile.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <Github className="h-4 w-4 text-tinta-fraca" />
                  GitHub
                </a>
              )}
              {profile.linkedin && (
                <a
                  href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <Linkedin className="h-4 w-4 text-tinta-fraca" />
                  LinkedIn
                </a>
              )}
              {profile.lattesUrl && (
                <a
                  href={profile.lattesUrl.startsWith("http") ? profile.lattesUrl : `https://${profile.lattesUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <FileText className="h-4 w-4 text-tinta-fraca" />
                  {language === "en" ? "Lattes Curriculum" : "Currículo Lattes"}
                </a>
              )}
              {profile.orcidUrl && (
                <a
                  href={profile.orcidUrl.startsWith("http") ? profile.orcidUrl : `https://${profile.orcidUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <Globe className="h-4 w-4 text-tinta-fraca" />
                  ORCID
                </a>
              )}
              {profile.twitter && (
                <a
                  href={profile.twitter.startsWith("http") ? profile.twitter : `https://twitter.com/${profile.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <Twitter className="h-4 w-4 text-tinta-fraca" />
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
          <div className="flex flex-wrap items-center gap-3 no-print print:hidden">
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
              className="inline-flex items-center gap-2 rounded-xl bg-acento px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-acento-forte active:scale-95 cursor-pointer"
              id="hero-download-cv-btn"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>{language === "en" ? "Download CV (PDF)" : "Baixar currículo (PDF)"}</span>
            </button>

            <Link
              to={localePath("/projetos", language)}
              className="inline-flex items-center rounded-xl border border-borda-forte px-5 py-2.5 text-sm font-bold text-tinta transition-colors hover:border-acento hover:text-acento-tinta"
            >
              {language === "en" ? "See the projects" : "Ver os projetos"}
            </Link>

            {isEditMode && onOpenElevatorPitchPresent && (
              <button
                type="button"
                onClick={onOpenElevatorPitchPresent}
                className="inline-flex items-center gap-2 rounded-xl border border-borda-forte px-5 py-2.5 text-sm font-bold text-tinta transition-colors hover:border-acento hover:text-acento-tinta"
              >
                <Presentation className="h-4 w-4 shrink-0" />
                <span>Elevator Pitch</span>
              </button>
            )}
          </div>

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

/**
 * A apresentação: um parágrafo por bloco separado por linha vazia no editor.
 *
 * Um parágrafo por vez fica em destaque — maior e em tinta cheia. Em repouso
 * é o primeiro, como entrada do texto; com o mouse, o destaque vai para o
 * parágrafo sob o cursor, e volta ao primeiro quando o cursor sai.
 *
 * O destaque amplia o parágrafo com `scale`, e não com `font-size`: trocar o
 * corpo da letra refaz as quebras de linha e empurra o resto da página a cada
 * movimento do mouse. Com `scale`, cada linha continua com as mesmas palavras,
 * só maiores, e nada ao redor se move. Para o parágrafo ampliado não passar
 * da coluna, todos são diagramados em `100% / ESCALA` da largura — ampliado a
 * partir da borda esquerda, ele ocupa exatamente a coluna inteira.
 *
 * Componente à parte para o hover não renderizar a abertura inteira. Só mouse:
 * no toque não há hover, e o primeiro segue como entrada.
 */
function Apresentacao({ paragrafos }: { paragrafos: string[] }) {
  const [ativo, setAtivo] = useState(0);

  return (
    <div className="flex max-w-[64ch] flex-col gap-6 print-break-inside-avoid" onPointerLeave={() => setAtivo(0)}>
      {paragrafos.map((paragrafo, i) => (
        <p
          key={i}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setAtivo(i);
          }}
          className={`w-[calc(100%/1.12)] origin-left text-base leading-relaxed transition-[color,scale] duration-300 ease-out sm:text-[1.0625rem] print:w-full print:scale-100 ${
            i === ativo ? "scale-[1.12] text-tinta" : "text-tinta-suave"
          }`}
        >
          {paragrafo}
        </p>
      ))}
    </div>
  );
}
