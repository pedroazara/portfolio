import React, { useState } from "react";
import type { ResumeData } from "../types";
import { initialResumeData } from "../data/initialData";
import { changedFields, downloadJson, readRevisions } from "../lib/localWorkspace";
import { parseResumeData } from "../lib/contentSchema";
import { fetchResumeData } from "../lib/dataService";
import { supabase } from "../lib/supabase";

interface Props { data: ResumeData; sandbox: boolean; conflict: boolean; onApply: (data: ResumeData, version?: string | null) => void }
export default function WorkspaceTools({ data, sandbox, conflict, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState<ResumeData | null>(null);
  const [version, setVersion] = useState<string | null | undefined>();
  const [error, setError] = useState("");
  const [cloudHistory, setCloudHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const propose = (next: ResumeData, label: string) => { setCandidate(parseResumeData(next)); setLabel(label); setVersion(undefined); setError(""); };
  const loadCloud = async () => {
    setBusy(true);
    try { const latest = await fetchResumeData(); if (!latest.data) throw new Error("Documento não encontrado."); propose(latest.data, "Versão atual da nuvem"); setVersion(latest.version); }
    catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar."); }
    finally { setBusy(false); }
  };
  const history = async () => {
    setBusy(true);
    try {
      const result = await supabase.from("portfolio_revisions").select("id,created_at,old_data,changed_fields").order("created_at", { ascending: false }).limit(20);
      if (result.error) throw new Error("Histórico remoto indisponível. Instale a migração technical-upgrade.sql.");
      setCloudHistory(result.data || []);
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  };
  const button = "rounded-lg border border-borda px-3 py-2 text-sm hover:bg-superficie-alta disabled:opacity-50";
  return <section className="no-print mb-4 rounded-xl border border-borda bg-superficie p-3 text-tinta">
    <button className={button} onClick={() => setOpen(!open)} aria-expanded={open}>{sandbox ? "Ambiente de teste" : "Histórico e recuperação"}</button>
    {conflict && <p role="alert" className="mt-2 text-amber-700">Outra sessão alterou os dados. Abra a comparação para escolher o que manter.</p>}
    {(open || conflict) && <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className={button} onClick={() => downloadJson(data, sandbox ? "portfolio-teste.json" : "portfolio-backup.json")}>Exportar JSON</button>
        <label className={button}>Importar JSON<input aria-label="Importar JSON" className="sr-only" type="file" accept="application/json,.json" onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return;
          try { if (file.size > 5000000) throw new Error("Limite de importação: 5 MB."); propose(parseResumeData(JSON.parse(await file.text())), "Arquivo importado"); }
          catch { setError("Arquivo inválido. Confira a estrutura e os tipos dos campos."); }
          e.target.value = "";
        }} /></label>
        <button className={button} disabled={busy} onClick={loadCloud}>{sandbox ? "Comparar com dados publicados" : "Comparar com a nuvem"}</button>
        {sandbox ? <button className={button} onClick={() => propose(initialResumeData, "Restaurar dados iniciais de demonstração")}>Resetar demonstração</button> : <button className={button} disabled={busy} onClick={history}>Histórico da nuvem</button>}
      </div>
      {error && <p role="alert">{error}</p>}
      {candidate && <div className="space-y-3 rounded-lg border border-borda p-3">
        <p className="font-semibold">Comparação: {label}</p>
        <p className="text-sm">Escolha quais seções manter da versão atual antes de aplicar.</p>
        {Object.keys(data).filter(k => changedFields((data as any)[k], (candidate as any)[k]).length).map(k => <details key={k} className="border-b border-borda py-2">
          <summary>{k}</summary>
          <div className="grid gap-2 md:grid-cols-2"><pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify((data as any)[k], null, 2)}</pre><pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify((candidate as any)[k], null, 2)}</pre></div>
          <button className={button} onClick={() => setCandidate({ ...candidate, [k]: (data as any)[k] })}>Manter minha seção: {k}</button>
        </details>)}
        <div className="flex gap-2"><button className={button} onClick={() => { onApply(candidate, sandbox ? undefined : version); setCandidate(null); }}>Aplicar versão revisada</button><button className={button} onClick={() => setCandidate(null)}>Cancelar</button></div>
      </div>}
      <details><summary>Histórico local deste navegador</summary>{readRevisions().map(r => <button key={r.id} className={`${button} my-1 block w-full text-left`} onClick={() => propose(r.data, `Antes de ${new Date(r.at).toLocaleString()}`)}>{new Date(r.at).toLocaleString()} — {r.fields.join(", ")}</button>)}</details>
      {cloudHistory.map(r => <button key={r.id} className={`${button} block`} onClick={() => propose(r.old_data, `Histórico: ${r.created_at}`)}>{r.created_at} — {r.changed_fields?.join(", ")}</button>)}
    </div>}
  </section>;
}
