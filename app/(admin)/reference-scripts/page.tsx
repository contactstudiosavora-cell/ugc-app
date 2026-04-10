"use client";

import { useState, useEffect, useRef } from "react";
import type { GlobalReferenceScriptRow, ScriptType } from "@/lib/types";

const CONTENT_TYPES: { value: ScriptType; label: string }[] = [
  { value: "ugc", label: "UGC" },
  { value: "micro_trottoir", label: "MICRO-TROTTOIR" },
  { value: "face_cam", label: "FACE CAM" },
  { value: "auto", label: "AUTO" },
];

export default function GlobalReferenceScriptsPage() {
  const [scripts, setScripts] = useState<GlobalReferenceScriptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scriptType, setScriptType] = useState<ScriptType | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/reference-scripts")
      .then((r) => r.json())
      .then((d) => setScripts(d.scripts ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    setError("");
    setSaving(true);
    try {
      let res: Response;
      if (mode === "file" && selectedFile) {
        const fd = new FormData();
        fd.append("file", selectedFile);
        fd.append("title", title);
        if (scriptType) fd.append("scriptType", scriptType);
        res = await fetch("/api/reference-scripts", { method: "POST", body: fd });
      } else {
        if (!content.trim()) { setError("Le contenu est requis."); setSaving(false); return; }
        res = await fetch("/api/reference-scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, scriptType: scriptType || null }),
        });
      }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const d = await res.json();
      setScripts((prev) => [d.script, ...prev]);
      setTitle(""); setContent(""); setScriptType(""); setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/reference-scripts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setScripts((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cream">
      {/* Header */}
      <div className="bg-cream-card border-b border-olive/10 px-8 py-6 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-olive-muted text-[10px] uppercase tracking-[0.2em]">Bibliothèque globale</span>
            </div>
            <h1 className="font-display text-3xl text-olive tracking-wider">MODÈLES GLOBAUX</h1>
            <p className="text-olive-muted text-sm mt-1 max-w-lg">
              Ces scripts entraînent l&apos;IA pour <strong className="text-olive">toutes les entreprises</strong>.
              Ils définissent les best practices du format UGC et améliorent chaque génération.
            </p>
          </div>
          <div className="bg-lime/15 border border-lime/30 rounded-xl px-4 py-3 text-center shrink-0">
            <div className="font-display text-2xl text-olive tracking-wider">{scripts.length}</div>
            <div className="text-olive-light text-[9px] uppercase tracking-widest">Modèles</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl space-y-6">

          {/* Info banner */}
          <div className="flex items-start gap-3 bg-lime/10 border border-lime/30 rounded-xl px-4 py-3">
            <span className="text-lime-dark mt-0.5">◎</span>
            <div className="text-sm text-olive-muted leading-relaxed">
              <strong className="text-olive">Comment ça fonctionne :</strong> les modèles ici servent de référence universelle.
              Pour des modèles spécifiques à une entreprise, va dans <strong className="text-olive">Entreprises → [Client] → Modèles</strong>.
            </div>
          </div>

          {/* Add form */}
          <div className="bg-cream-card border-2 border-olive/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-olive/8">
              <h2 className="font-display text-base text-olive tracking-wider">AJOUTER UN MODÈLE GLOBAL</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Mode selector */}
              <div className="flex gap-2">
                {(["paste", "file"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 rounded-xl border-2 text-[10px] font-display tracking-widest uppercase transition-all ${
                      mode === m ? "bg-olive border-olive text-lime" : "bg-cream-input border-olive/15 text-olive-muted hover:border-olive/30"
                    }`}
                  >
                    {m === "paste" ? "✏ COPIER-COLLER" : "📄 FICHIER .TXT"}
                  </button>
                ))}
              </div>

              {/* Title + scriptType */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-olive mb-1.5">Titre</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ex: Script émotionnel skincare"
                    className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3 py-2.5 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-olive mb-1.5">Type <span className="text-olive-light normal-case font-normal">(opt.)</span></label>
                  <select
                    value={scriptType}
                    onChange={(e) => setScriptType(e.target.value as ScriptType | "")}
                    className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3 py-2.5 text-olive text-sm focus:border-olive transition-colors"
                  >
                    <option value="">— Tous types —</option>
                    {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Content */}
              {mode === "paste" ? (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-olive mb-1.5">Script de référence</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Colle ici un script de référence qui servira de modèle…"
                    rows={8}
                    className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3 py-2.5 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors resize-none font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-olive mb-1.5">Fichier .txt</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,text/plain"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3 py-2.5 text-olive text-sm focus:border-olive transition-colors file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-olive file:text-white"
                  />
                  {selectedFile && <p className="text-xs text-olive-muted mt-1">✓ {selectedFile.name}</p>}
                </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={handleAdd}
                disabled={saving || (mode === "paste" ? !content.trim() : !selectedFile)}
                className="w-full bg-olive hover:bg-olive-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-display tracking-widest rounded-xl py-3 text-sm transition-all"
              >
                {saving ? "AJOUT EN COURS…" : "+ AJOUTER CE MODÈLE"}
              </button>
            </div>
          </div>

          {/* List */}
          <div>
            <h2 className="font-display text-sm text-olive-muted tracking-widest uppercase mb-3">
              MODÈLES ENREGISTRÉS ({scripts.length})
            </h2>
            {loading ? (
              <div className="text-center text-olive-muted text-sm py-8">Chargement…</div>
            ) : scripts.length === 0 ? (
              <div className="text-center bg-cream-card border-2 border-olive/10 rounded-xl py-12">
                <div className="text-4xl mb-3">◎</div>
                <p className="text-olive-muted text-sm">Aucun modèle global pour l&apos;instant</p>
                <p className="text-olive-light text-xs mt-1">Ajoute des scripts de référence ci-dessus</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scripts.map((s) => (
                  <div key={s.id} className="bg-cream-card border-2 border-olive/10 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm text-olive tracking-wide truncate">{s.title}</span>
                          {s.scriptType && (
                            <span className="shrink-0 text-[9px] font-display tracking-widest bg-olive/10 text-olive px-2 py-0.5 rounded">
                              {s.scriptType.toUpperCase()}
                            </span>
                          )}
                          <span className="shrink-0 text-[9px] text-olive-light">
                            {s.sourceType === "file" ? "📄" : "✏"} {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <p className="text-xs text-olive-muted mt-0.5 line-clamp-1">
                          {s.content.replace(/#+\s/g, "").replace(/\*/g, "").slice(0, 100)}…
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                          className="text-[10px] text-olive-muted hover:text-olive border border-olive/15 hover:border-olive/30 rounded-lg px-2.5 py-1.5 transition-all font-display tracking-widest"
                        >
                          {expandedId === s.id ? "▲ RÉDUIRE" : "▼ VOIR"}
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-[10px] text-red-400 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-lg px-2.5 py-1.5 transition-all font-display tracking-widest"
                        >
                          SUPPR.
                        </button>
                      </div>
                    </div>
                    {expandedId === s.id && (
                      <div className="px-4 pb-4 pt-0 border-t border-olive/8 bg-cream">
                        <pre className="text-xs text-olive-muted whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                          {s.content}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
