import React, { useState } from "react";
import { Course } from "../types";
import { Award, Plus, Edit2, Trash2, Calendar, ExternalLink } from "lucide-react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import MarkdownRenderer from "./MarkdownRenderer";
import { Language, translations } from "../lib/translations";

interface CoursesSectionProps {
  courses: Course[];
  isEditMode: boolean;
  onUpdateCourses: (updated: Course[]) => void;
  language?: Language;
}

export default function CoursesSection({
  courses = [],
  isEditMode,
  onUpdateCourses,
  language = "pt",
}: CoursesSectionProps) {
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => onConfirm);
    setConfirmOpen(true);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState<Partial<Course>>({
    name: "",
    nameEn: "",
    organization: "",
    issueDate: "",
    description: "",
    descriptionEn: "",
    credentialUrl: "",
  });

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setCourseForm({
      name: "",
      nameEn: "",
      organization: "",
      issueDate: "",
      description: "",
      descriptionEn: "",
      credentialUrl: "",
    });
    setEditingLanguage(language);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({ ...course });
    setEditingLanguage(language);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const confirmTitle = language === "en" ? "Delete Course / Certification" : "Excluir Curso / Certificação";
    const confirmMsg = language === "en" 
      ? "Are you sure you want to delete this course/certificate?" 
      : "Deseja realmente excluir este curso/certificado?";
    
    triggerConfirm(confirmTitle, confirmMsg, () => {
      onUpdateCourses(courses.filter((c) => c.id !== id));
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const complete: Course = {
      id: editingCourse?.id || `course-${Date.now()}`,
      name: courseForm.name || "Nome do Curso",
      nameEn: courseForm.nameEn || "",
      organization: courseForm.organization || "Organização",
      issueDate: courseForm.issueDate || "",
      description: courseForm.description || "",
      descriptionEn: courseForm.descriptionEn || "",
      credentialUrl: courseForm.credentialUrl || "",
    };

    if (editingCourse) {
      onUpdateCourses(courses.map((item) => (item.id === editingCourse.id ? complete : item)));
    } else {
      onUpdateCourses([...courses, complete]);
    }
    setIsModalOpen(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month] = dateStr.split("-");
    const months = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    if (month && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
      return `${months[parseInt(month, 10) - 1]} ${year}`;
    }
    return year;
  };

  return (
    <section id="certificacoes" className="scroll-mt-32 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-10 shadow-xs print-border print-shadow-none print-m-0 transition-colors duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-2.5 text-amber-600 dark:text-amber-400 print-border">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              {language === "en" ? "Courses & Certifications" : "Cursos & Certificações"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
              {language === "en" 
                ? "Free courses, specializations and certificates issued by platforms and institutions." 
                : "Cursos livres, especializações e certificados emitidos por plataformas e instituições."}
            </p>
          </div>
        </div>

        {isEditMode && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 no-print print:hidden cursor-pointer"
            id="add-course-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            {language === "en" ? "Add" : "Adicionar"}
          </button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center font-sans">
          <Award className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-700" />
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            {language === "en" ? "No courses or certificates added." : "Nenhum curso ou certificado adicionado."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-1">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group relative flex flex-col justify-between rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/20 p-5 transition-all hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-950/40 print-border print-bg-none print:p-4 print-break-inside-avoid"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 print-border print-bg-none">
                      <Award className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white font-display text-sm sm:text-base leading-tight">
                        {language === "en" && course.nameEn ? course.nameEn : course.name}
                      </h3>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-sans mt-0.5">
                        {course.organization}
                      </p>
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  {isEditMode && (
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity no-print print:hidden shrink-0">
                      <button
                        onClick={() => handleOpenEdit(course)}
                        className="rounded-md p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        title={language === "en" ? "Edit" : "Editar"}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="rounded-md p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title={language === "en" ? "Delete" : "Excluir"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-sans text-xs">
                  <Calendar className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                  <span>{language === "en" ? `Issued in ${formatDate(course.issueDate)}` : `Emitido em ${formatDate(course.issueDate)}`}</span>
                </div>

                {(course.description || course.descriptionEn) && (
                  <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
                    <MarkdownRenderer content={language === "en" && course.descriptionEn ? course.descriptionEn : course.description} className="text-xs text-slate-500 dark:text-slate-400 font-sans space-y-1" />
                  </div>
                )}
              </div>

              {course.credentialUrl && (
                <div className="mt-4 pt-3 border-t border-slate-100/80 dark:border-slate-800/80 flex">
                  <a
                    href={course.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <span>{language === "en" ? "Show credential" : "Exibir credencial"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* EDIT/ADD MODAL */}
      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourse ? (language === "en" ? "Edit Course / Certification" : "Editar Curso / Certificação") : (language === "en" ? "Add Course / Certification" : "Adicionar Curso / Certificação")}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Editing Language Toggle */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700 font-sans">
                {language === "en" ? "Language under Editing" : "Idioma em Edição"}
              </p>
              <p className="text-[10px] text-slate-400 font-sans">
                {language === "en" 
                  ? "Toggle to specify contents in Portuguese or English" 
                  : "Alterne para preencher as informações em Português ou Inglês"}
              </p>
            </div>
            <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1 self-start sm:self-auto shrink-0 font-sans">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {editingLanguage === "pt" ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 font-sans">
                  Nome do Curso ou Certificado * (Português)
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.name || ""}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  placeholder="Ex: Python para Ciência de Dados"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-sans focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 font-sans">
                  Course or Certificate Name * (English)
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.nameEn || ""}
                  onChange={(e) => setCourseForm({ ...courseForm, nameEn: e.target.value })}
                  placeholder="Ex: Python for Data Science"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-sans focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 font-sans">
                {language === "en" ? "Issuing Organization *" : "Organização Emissora *"}
              </label>
              <input
                type="text"
                required
                value={courseForm.organization || ""}
                onChange={(e) => setCourseForm({ ...courseForm, organization: e.target.value })}
                placeholder="Ex: Coursera, Alura, USP"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-sans focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 font-sans">
                {language === "en" ? "Issue Date *" : "Data de Emissão *"}
              </label>
              <input
                type="month"
                required
                value={courseForm.issueDate || ""}
                onChange={(e) => setCourseForm({ ...courseForm, issueDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-sans focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 font-sans">
                {language === "en" ? "Credential URL" : "URL da Credencial / Certificado"}
              </label>
              <input
                type="url"
                value={courseForm.credentialUrl || ""}
                onChange={(e) => setCourseForm({ ...courseForm, credentialUrl: e.target.value })}
                placeholder="Ex: https://certificado.exemplo.com/123"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-sans focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {editingLanguage === "pt" ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 font-sans">
                Descrição do Aprendizado (Português)
              </label>
              <textarea
                rows={3}
                value={courseForm.description || ""}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                placeholder="Descreva as competências e tecnologias aprendidas..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-sans focus:border-indigo-500 focus:outline-hidden resize-y"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 font-sans">
                Description of Learning (English)
              </label>
              <textarea
                rows={3}
                value={courseForm.descriptionEn || ""}
                onChange={(e) => setCourseForm({ ...courseForm, descriptionEn: e.target.value })}
                placeholder="Describe skills and technologies learned in English..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-sans focus:border-indigo-500 focus:outline-hidden resize-y"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {language === "en" ? "Cancel" : "Cancelar"}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              {language === "en" ? "Save Changes" : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </EditModal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmCallback || (() => {})}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={language === "en" ? "Delete" : "Excluir"}
        cancelText={language === "en" ? "Cancel" : "Cancelar"}
        type="danger"
      />
    </section>
  );
}
