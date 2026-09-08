import React from "react";
export default function DraftRecovery({ at, onRestore, onDiscard }: { at: string; onRestore: () => void; onDiscard: () => void }) {
  return <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-slate-900">
    <span>Há uma edição local de {new Date(at).toLocaleString()}.</span>
    <button type="button" className="underline" onClick={onRestore}>Recuperar edição</button>
    <button type="button" className="underline" onClick={onDiscard}>Descartar recuperação</button>
  </div>;
}
