import React from "react";
import { useNavigate } from "react-router-dom";
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
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </nav>

      {tab === "tarefas" && <TasksBoard />}
      {tab === "habitos" && <HabitTracker />}
      {tab === "notas" && <QuickNotes />}
      {tab === "links" && <LinkVault />}
      {tab === "rascunhos" && <DraftsPanel />}
    </div>
  );
}
