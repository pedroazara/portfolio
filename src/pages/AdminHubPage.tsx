import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { KanbanSquare, Flame, StickyNote, Bookmark, PenLine } from "lucide-react";
import TasksBoard from "../components/TasksBoard";
import HabitTracker from "../components/HabitTracker";
import QuickNotes from "../components/QuickNotes";
import LinkVault from "../components/LinkVault";
import DraftsPanel from "../components/DraftsPanel";
import { AdminHubTab, ADMIN_HUB_TABS } from "../lib/adminHubTabs";

export type { AdminHubTab } from "../lib/adminHubTabs";

const TAB_META: Record<AdminHubTab, { label: string; icon: typeof KanbanSquare }> = {
  tarefas: { label: "Tarefas", icon: KanbanSquare },
  habitos: { label: "Hábitos", icon: Flame },
  notas: { label: "Notas", icon: StickyNote },
  links: { label: "Links", icon: Bookmark },
  rascunhos: { label: "Rascunhos", icon: PenLine },
};

interface AdminHubPageProps {
  tab: AdminHubTab;
}

export default function AdminHubPage({ tab }: AdminHubPageProps) {
  const navigate = useNavigate();

  // O conteúdo anima ao trocar de aba, mas não na primeira renderização — sem
  // isso, o painel inteiro "nascia" deslizando de baixo para cima assim que a
  // página abria, o que parecia um soluço de carregamento, não uma transição.
  //
  // Isso precisa ser estado, não uma ref mutada durante o render: em
  // StrictMode (ativo em `main.tsx`) o React chama a função do componente duas
  // vezes por montagem, e uma ref já viraria `false` na primeira chamada —
  // fazendo a renderização que de fato vai para a tela pensar que não é mais a
  // primeira. Estado não sofre disso, porque não é alterado durante o render.
  const [hasAnimatedTabOnce, setHasAnimatedTabOnce] = useState(false);
  useEffect(() => {
    setHasAnimatedTabOnce(true);
  }, []);
  const tabInitial = hasAnimatedTabOnce ? { opacity: 0, y: 8 } : false;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Painel pessoal
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Área privada — nada aqui aparece no site.
        </p>
      </header>

      <nav className="mb-8 flex flex-wrap gap-1.5 border-b border-slate-200 pb-3 dark:border-slate-800">
        {ADMIN_HUB_TABS.map((key) => {
          const { label, icon: Icon } = TAB_META[key];
          const isActive = key === tab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => navigate(`/admin/painel/${key}`)}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? "text-white font-semibold"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="admin-hub-tab-pill"
                  className="absolute inset-0 rounded-lg bg-indigo-600"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={tabInitial}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {tab === "tarefas" && <TasksBoard />}
          {tab === "habitos" && <HabitTracker />}
          {tab === "notas" && <QuickNotes />}
          {tab === "links" && <LinkVault />}
          {tab === "rascunhos" && <DraftsPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
