// Accent palette cycled per category so groups are visually easy to tell apart.
export const CATEGORY_ACCENTS = [
  { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400", bar: "bg-indigo-600 dark:bg-indigo-500", ring: "ring-indigo-400/60 dark:ring-indigo-500/50", line: "#6366f1" },
  { bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-600 dark:text-sky-400", bar: "bg-sky-600 dark:bg-sky-500", ring: "ring-sky-400/60 dark:ring-sky-500/50", line: "#0ea5e9" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-600 dark:bg-emerald-500", ring: "ring-emerald-400/60 dark:ring-emerald-500/50", line: "#10b981" },
  { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500 dark:bg-amber-500", ring: "ring-amber-400/60 dark:ring-amber-500/50", line: "#f59e0b" },
  { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400", bar: "bg-violet-600 dark:bg-violet-500", ring: "ring-violet-400/60 dark:ring-violet-500/50", line: "#8b5cf6" },
  { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-600 dark:bg-rose-500", ring: "ring-rose-400/60 dark:ring-rose-500/50", line: "#f43f5e" },
  { bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400", bar: "bg-teal-600 dark:bg-teal-500", ring: "ring-teal-400/60 dark:ring-teal-500/50", line: "#0d9488" },
  { bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40", text: "text-fuchsia-600 dark:text-fuchsia-400", bar: "bg-fuchsia-600 dark:bg-fuchsia-500", ring: "ring-fuchsia-400/60 dark:ring-fuchsia-500/50", line: "#d946ef" },
];

export type CategoryAccent = (typeof CATEGORY_ACCENTS)[number];

export const getCategoryAccent = (index: number): CategoryAccent =>
  CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length];
