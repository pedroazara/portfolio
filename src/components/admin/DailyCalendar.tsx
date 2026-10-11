import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthGrid } from "../../lib/dailyUpdatesService";
import { kindStyle } from "./DailyUpdateCard";

/**
 * Calendário do mês na aba Atualizações: cada dia mostra um ponto por série
 * que chegou nele, e clicar abre o que teve naquele dia.
 */

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

interface Props {
  year: number;
  /** 1 a 12. */
  month: number;
  onMonthChange: (year: number, month: number) => void;
  selected: string;
  onSelect: (day: string) => void;
  today: string;
  /** Séries que chegaram em cada dia (`AAAA-MM-DD`). */
  kindsByDay: Map<string, string[]>;
}

export default function DailyCalendar({ year, month, onMonthChange, selected, onSelect, today, kindsByDay }: Props) {
  const weeks = monthGrid(year, month);
  const monthName = new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });
  // "Outubro de 2026": só a primeira letra em maiúscula.
  const title = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} de ${year}`;
  const step = (amount: number) => {
    const index = year * 12 + (month - 1) + amount;
    onMonthChange(Math.floor(index / 12), (index % 12) + 1);
  };
  const navButton =
    "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button type="button" className={navButton} onClick={() => step(-1)} aria-label="Mês anterior">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white" aria-live="polite">
            {title}
          </h3>
          {(selected !== today || `${year}-${String(month).padStart(2, "0")}` !== today.slice(0, 7)) && (
            <button
              type="button"
              onClick={() => {
                onMonthChange(Number(today.slice(0, 4)), Number(today.slice(5, 7)));
                onSelect(today);
              }}
              className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400"
            >
              Hoje
            </button>
          )}
        </div>
        <button type="button" className={navButton} onClick={() => step(1)} aria-label="Próximo mês">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <table className="w-full table-fixed border-collapse text-center" aria-label={title}>
        <thead>
          <tr>
            {WEEKDAYS.map((label, index) => (
              <th key={index} scope="col" className="pb-2 text-[11px] font-semibold text-slate-400">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].day}>
              {week.map(({ day, inMonth }) => {
                const kinds = kindsByDay.get(day) ?? [];
                const isSelected = day === selected;
                const isToday = day === today;
                return (
                  <td key={day} className="p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(day);
                        if (!inMonth) onMonthChange(Number(day.slice(0, 4)), Number(day.slice(5, 7)));
                      }}
                      aria-pressed={isSelected}
                      aria-label={`${new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}${
                        kinds.length ? `, ${kinds.length} ${kinds.length === 1 ? "série" : "séries"}` : ""
                      }`}
                      className={`flex h-11 w-full flex-col items-center justify-center gap-1 rounded-xl text-sm transition sm:h-12 ${
                        isSelected
                          ? "bg-indigo-600 font-bold text-white dark:bg-indigo-500"
                          : isToday
                            ? "font-bold text-indigo-600 ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50 dark:text-indigo-300 dark:ring-indigo-800 dark:hover:bg-indigo-950/40"
                            : inMonth
                              ? "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                              : "text-slate-300 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <span className="leading-none">{Number(day.slice(8))}</span>
                      <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                        {kinds.slice(0, 3).map((kind) => (
                          <span
                            key={kind}
                            className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/90" : kindStyle(kind).dot}`}
                          />
                        ))}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
