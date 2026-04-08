"use client";

import { useState, useEffect } from "react";
import type { HistoryEntry, ScriptAngle } from "@/lib/types";
import ScriptRenderer from "@/components/ScriptRenderer";

const ANGLE_LABELS: Record<ScriptAngle, { label: string; emoji: string }> = {
  emotional: { label: "ÉMOTIONNEL", emoji: "❤️" },
  problem_solution: { label: "PROBLÈME/SOLUTION", emoji: "🎯" },
  curiosity: { label: "CURIOSITÉ", emoji: "🔥" },
};

const TYPE_LABELS: Record<string, string> = {
  ugc: "UGC",
  micro_trottoir: "MICRO-TROTTOIR",
  face_cam: "FACE CAM",
  auto: "AUTO",
};

type Filter = "all" | "validated";

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeAngle, setActiveAngle] = useState<ScriptAngle>("emotional");
  const [copied, setCopied] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validateFeedback, setValidateFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => setEntries(d.history ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    await fetch("/api/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const handleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
    setActiveAngle("emotional");
    setCopied(false);
    setValidateFeedback(null);
  };

  /** Validate an angle. If it's already the validated one → unvalidate. */
  const handleValidate = async (entryId: string, angle: ScriptAngle) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    const newValidated = entry.validated === angle ? null : angle;
    setValidating(true);

    try {
      const res = await fetch("/api/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entryId, validated: newValidated }),
      });
      if (!res.ok) throw new Error();

      // Update local state optimistically
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, validated: newValidated } : e
        )
      );

      setValidateFeedback(
        newValidated
          ? `Script "${ANGLE_LABELS[angle].label}" validé ✓`
          : "Validation retirée"
      );
      setTimeout(() => setValidateFeedback(null), 2500);
    } catch {
      /* silent */
    } finally {
      setValidating(false);
    }
  };

  const copyScript = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAll = (entry: HistoryEntry) => {
    const content = (
      Object.entries(ANGLE_LABELS) as [ScriptAngle, { label: string; emoji: string }][]
    )
      .map(([key, { emoji, label }]) =>
        `${"=".repeat(40)}\n${emoji} ${label}\n${"=".repeat(40)}\n\n${entry.scripts[key] || ""}`
      )
      .join("\n\n\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `scripts-ugc-${entry.createdAt.split("T")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const filtered = filter === "validated" ? entries.filter((e) => e.validated) : entries;
  const expandedEntry = entries.find((e) => e.id === expanded);

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {/* ── LEFT: List ─────────────────────────────────────────── */}
      <div className="w-[380px] shrink-0 bg-cream-card border-r border-olive/10 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-7 pb-5 border-b border-olive/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-lime inline-block" />
            <span className="text-olive-muted text-[10px] uppercase tracking-[0.2em] font-semibold">
              {entries.length} génération{entries.length !== 1 ? "s" : ""}
            </span>
          </div>
          <h1 className="font-display text-3xl text-olive tracking-wider leading-none mb-4">
            HISTORIQUE
          </h1>
          <div className="flex gap-1.5">
            {(["all", "validated"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg border-2 text-[10px] font-display tracking-widest transition-all ${
                  filter === f
                    ? "bg-olive border-olive text-lime"
                    : "bg-cream-input border-olive/15 text-olive-muted hover:border-olive/30 hover:text-olive"
                }`}
              >
                {f === "all" ? "TOUS" : "✓ VALIDÉS"}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-olive-muted text-sm uppercase tracking-widest">
              Chargement…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <div className="text-3xl mb-3 opacity-20">◈</div>
              <div className="text-olive-muted text-xs uppercase tracking-widest">Aucune génération</div>
              <div className="text-olive-light text-[10px] mt-1">
                {filter === "validated"
                  ? "Valide des scripts depuis la page Générer ou ici"
                  : "Lance ta première génération"}
              </div>
            </div>
          ) : (
            filtered.map((entry) => (
              <button
                key={entry.id}
                onClick={() => handleExpand(entry.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  expanded === entry.id
                    ? "bg-olive border-olive"
                    : "bg-cream-input border-olive/12 hover:border-olive/25"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[9px] uppercase tracking-widest font-display ${expanded === entry.id ? "text-lime" : "text-olive-muted"}`}>
                        {TYPE_LABELS[entry.input.scriptType] ?? entry.input.scriptType ?? "UGC"}
                      </span>
                      <span className={`text-[9px] ${expanded === entry.id ? "text-white/30" : "text-olive/25"}`}>·</span>
                      <span className={`text-[9px] font-sans ${expanded === entry.id ? "text-white/30" : "text-olive/30"}`}>
                        {entry.input.duration ?? "—"}s
                      </span>
                      {entry.validated && (
                        <>
                          <span className={`text-[9px] ${expanded === entry.id ? "text-white/30" : "text-olive/25"}`}>·</span>
                          <span className="text-[9px] text-lime font-display tracking-widest">
                            ✓ {ANGLE_LABELS[entry.validated]?.label}
                          </span>
                        </>
                      )}
                    </div>
                    <div className={`text-xs font-semibold truncate ${expanded === entry.id ? "text-white" : "text-olive"}`}>
                      {entry.input.url || entry.input.description || entry.input.niche || "Sans titre"}
                    </div>
                    <div className={`text-[10px] mt-1.5 ${expanded === entry.id ? "text-white/30" : "text-olive-light"}`}>
                      {new Date(entry.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className={`font-mono text-[10px] shrink-0 ${expanded === entry.id ? "text-lime" : "text-olive-muted"}`}>
                    ${(entry.cost ?? 0).toFixed(5)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Preview ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!expandedEntry ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center select-none">
              <div className="w-20 h-20 rounded-2xl bg-olive/8 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl opacity-30">◈</span>
              </div>
              <h3 className="font-display text-2xl text-olive tracking-wider mb-2">SÉLECTIONNE</h3>
              <p className="text-olive-muted text-sm">Clique sur une génération à gauche</p>
            </div>
          </div>
        ) : (
          <div className="p-7 space-y-5 animate-fade-in">
            {/* Meta row */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime inline-block" />
                  <span className="text-olive-muted text-[10px] uppercase tracking-[0.2em] font-semibold">
                    {TYPE_LABELS[expandedEntry.input.scriptType] ?? "UGC"} · {expandedEntry.input.duration ?? "—"}s
                  </span>
                </div>
                <h2 className="font-display text-2xl text-olive tracking-wider">
                  {(expandedEntry.input.url || expandedEntry.input.description || expandedEntry.input.niche || "SANS TITRE").toUpperCase()}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 text-olive-light text-[10px] flex-wrap">
                  {expandedEntry.input.niche && <span>{expandedEntry.input.niche}</span>}
                  <span>·</span>
                  <span>
                    {new Date(expandedEntry.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => downloadAll(expandedEntry)}
                  className="flex items-center gap-1.5 bg-white border-2 border-olive/15 hover:border-olive/30 text-olive-muted hover:text-olive rounded-xl px-3 py-2 text-[10px] font-display tracking-widest transition-all"
                >
                  ⬇ EXPORT .TXT
                </button>
                <button
                  onClick={() => handleDelete(expandedEntry.id)}
                  className="flex items-center gap-1.5 bg-red-50 border-2 border-red-200 hover:border-red-400 text-red-400 hover:text-red-600 rounded-xl px-3 py-2 text-[10px] font-display tracking-widest transition-all"
                >
                  ✕ SUPPRIMER
                </button>
              </div>
            </div>

            {/* Validation status banner */}
            {expandedEntry.validated ? (
              <div className="flex items-center gap-3 bg-lime/15 border-2 border-lime/40 rounded-xl px-4 py-3">
                <span className="text-lg">✓</span>
                <div>
                  <div className="text-olive font-display tracking-wider text-sm">
                    SCRIPT {ANGLE_LABELS[expandedEntry.validated].label} VALIDÉ
                  </div>
                  <div className="text-olive-muted text-[10px] mt-0.5">
                    Clique sur ✓ Valider sur un autre angle pour changer, ou sur le même pour retirer la validation.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-olive/[0.04] border border-olive/10 rounded-xl px-4 py-3">
                <span className="text-sm opacity-40">◎</span>
                <div className="text-olive-muted text-[10px]">
                  Aucun script validé pour cette génération. Sélectionne un angle et clique sur <strong className="text-olive">✓ Valider</strong>.
                </div>
              </div>
            )}

            {/* Feedback toast */}
            {validateFeedback && (
              <div className="flex items-center gap-2 bg-olive text-lime border border-lime/30 rounded-xl px-4 py-2.5 text-xs font-display tracking-widest animate-fade-in">
                <span>✓</span> {validateFeedback}
              </div>
            )}

            {/* Angle tabs */}
            <div className="flex gap-2">
              {(Object.entries(ANGLE_LABELS) as [ScriptAngle, { label: string; emoji: string }][]).map(
                ([key, { label, emoji }]) => {
                  const isValidated = expandedEntry.validated === key;
                  return (
                    <button
                      key={key}
                      onClick={() => { setActiveAngle(key); setCopied(false); }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-[10px] font-display tracking-widest transition-all duration-150 ${
                        activeAngle === key
                          ? "bg-olive border-olive text-lime"
                          : "bg-white border-olive/15 text-olive-muted hover:border-olive/30 hover:text-olive"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="hidden sm:inline">{label}</span>
                      {isValidated && <span className="text-lime text-[9px] font-bold">✓</span>}
                    </button>
                  );
                }
              )}
            </div>

            {/* Script card */}
            <div className="bg-white border-2 border-olive/10 rounded-2xl overflow-hidden">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-olive/8 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-olive flex items-center justify-center shrink-0">
                    <span className="text-sm">{ANGLE_LABELS[activeAngle].emoji}</span>
                  </div>
                  <div>
                    <div className="font-display text-olive tracking-wider text-base leading-none">
                      {ANGLE_LABELS[activeAngle].label}
                    </div>
                    {expandedEntry.validated === activeAngle && (
                      <span className="text-[9px] text-lime-dark font-display tracking-widest">✓ VALIDÉ</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => copyScript(expandedEntry.scripts[activeAngle] || "")}
                    className="flex items-center gap-1.5 bg-white border-2 border-olive/15 hover:border-olive/30 text-olive-muted hover:text-olive rounded-xl px-3 py-1.5 text-[10px] font-display tracking-widest transition-all"
                  >
                    {copied ? <span className="text-lime-dark">✓ COPIÉ</span> : "📋 COPIER"}
                  </button>

                  {/* Validate / Unvalidate button */}
                  {expandedEntry.validated === activeAngle ? (
                    <button
                      onClick={() => handleValidate(expandedEntry.id, activeAngle)}
                      disabled={validating}
                      className="flex items-center gap-1.5 bg-lime/20 border-2 border-lime/50 text-olive hover:bg-red-50 hover:border-red-300 hover:text-red-500 rounded-xl px-3 py-1.5 text-[10px] font-display tracking-widest transition-all disabled:opacity-40"
                      title="Cliquer pour retirer la validation"
                    >
                      {validating ? "…" : "✓ VALIDÉ — RETIRER"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleValidate(expandedEntry.id, activeAngle)}
                      disabled={validating}
                      className={`flex items-center gap-1.5 border-2 rounded-xl px-3 py-1.5 text-[10px] font-display tracking-widest transition-all disabled:opacity-40 ${
                        expandedEntry.validated
                          ? "bg-olive/5 border-olive/20 text-olive-muted hover:bg-lime/10 hover:border-lime/50 hover:text-olive"
                          : "bg-lime/10 border-lime/40 text-olive hover:bg-lime/20"
                      }`}
                    >
                      {validating ? "…" : expandedEntry.validated ? "⇄ CHANGER VALIDATION" : "✓ VALIDER CE SCRIPT"}
                    </button>
                  )}
                </div>
              </div>

              {/* Script body */}
              <div className="p-5">
                <ScriptRenderer content={expandedEntry.scripts[activeAngle] || "Script non disponible"} />
              </div>
            </div>

            {/* Input recap */}
            {(expandedEntry.input.instructions || expandedEntry.input.niche || expandedEntry.input.description) && (
              <div className="bg-cream-card border border-olive/8 rounded-xl p-4 space-y-2">
                <div className="text-olive-light text-[9px] uppercase tracking-[0.2em] font-semibold mb-3">
                  Paramètres utilisés
                </div>
                {expandedEntry.input.niche && (
                  <div className="text-xs text-olive-muted">
                    <span className="text-olive-light uppercase tracking-widest text-[9px]">Niche : </span>
                    {expandedEntry.input.niche}
                  </div>
                )}
                {expandedEntry.input.description && (
                  <div className="text-xs text-olive-muted">
                    <span className="text-olive-light uppercase tracking-widest text-[9px]">Description : </span>
                    {expandedEntry.input.description}
                  </div>
                )}
                {expandedEntry.input.instructions && (
                  <div className="text-xs text-olive-muted">
                    <span className="text-olive-light uppercase tracking-widest text-[9px]">Instructions : </span>
                    {expandedEntry.input.instructions}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
