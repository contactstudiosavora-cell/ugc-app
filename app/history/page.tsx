"use client";

import { useState, useEffect } from "react";
import type { HistoryEntry, ScriptAngle, PackageRow } from "@/lib/types";
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
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeAngle, setActiveAngle] = useState<ScriptAngle>("emotional");
  const [copied, setCopied] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validateFeedback, setValidateFeedback] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // Manual editing
  const [editModal, setEditModal] = useState<{ entryId: string; angle: ScriptAngle; content: string } | null>(null);
  const [editAiInstruction, setEditAiInstruction] = useState("");
  const [editAiLoading, setEditAiLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/history").then((r) => r.json()),
      fetch("/api/packages").then((r) => r.json())
    ])
      .then(([historyData, packagesData]) => {
        setEntries(historyData.history ?? []);
        setPackages(packagesData.packages ?? []);
      })
      .catch(() => {
        setEntries([]);
        setPackages([]);
      })
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
    setSelectedPackage("");
  };

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

  const handleAssignPackage = async () => {
    if (!selectedPackage || !expanded) return;
    setAssigning(true);
    
    try {
      const entry = entries.find((e) => e.id === expanded);
      if (!entry || !entry.validated) return;

      // Find the script ID from the validated angle
      const res = await fetch(`/api/scripts/${expanded}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackage }),
      });

      if (!res.ok) throw new Error();

      const pkg = packages.find((p) => p.id === selectedPackage);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === expanded
            ? { ...e, packageId: selectedPackage, packageName: pkg?.name ?? null }
            : e
        )
      );

      setValidateFeedback(`✓ Script ajouté au package "${pkg?.name}"`);
      setTimeout(() => setValidateFeedback(null), 2500);
      setSelectedPackage("");
    } catch {
      setValidateFeedback("❌ Erreur lors de l'assignation");
      setTimeout(() => setValidateFeedback(null), 2500);
    } finally {
      setAssigning(false);
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

  const handleOpenEdit = (entryId: string, angle: ScriptAngle, content: string) => {
    setEditModal({ entryId, angle, content });
    setEditAiInstruction("");
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setEditSaving(true);
    try {
      await fetch("/api/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editModal.entryId, angle: editModal.angle, content: editModal.content }),
      });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editModal.entryId
            ? { ...e, scripts: { ...e.scripts, [editModal.angle]: editModal.content } }
            : e
        )
      );
      setEditModal(null);
    } catch { /* silent */ }
    finally { setEditSaving(false); }
  };

  const handleAiEditHistory = async () => {
    if (!editAiInstruction.trim() || !editModal) return;
    setEditAiLoading(true);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: editModal.content,
          instruction: editAiInstruction,
          scriptType: "ugc",
          duration: "30-60",
        }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setEditModal((prev) => prev ? { ...prev, content: d.script } : prev);
      setEditAiInstruction("");
    } catch { /* silent */ }
    finally { setEditAiLoading(false); }
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
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-lime/15 border-2 border-lime/40 rounded-xl px-4 py-3">
                  <span className="text-lg">✓</span>
                  <div className="flex-1">
                    <div className="text-olive font-display tracking-wider text-sm">
                      SCRIPT {ANGLE_LABELS[expandedEntry.validated].label} VALIDÉ
                    </div>
                    <div className="text-olive-muted text-[10px] mt-0.5">
                      Clique sur ✓ Valider sur un autre angle pour changer, ou sur le même pour retirer la validation.
                    </div>
                  </div>
                  {expandedEntry.packageName && (
                    <div className="text-[10px] text-lime-dark font-display tracking-widest px-3 py-1.5 bg-lime/20 rounded-lg border border-lime/50">
                      📦 {expandedEntry.packageName}
                    </div>
                  )}
                </div>

                {/* Package Assignment Section - Prominent */}
                {packages.length > 0 && (
                  <div className="bg-gradient-to-r from-lime/10 to-olive/5 border-2 border-lime/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">📦</span>
                      <div>
                        <div className="font-display text-olive tracking-wider text-base">
                          {expandedEntry.packageId ? "CHANGER DE PACKAGE" : "AJOUTER À UN PACKAGE"}
                        </div>
                        <div className="text-olive-muted text-[10px] mt-0.5">
                          Organisez vos scripts validés par package
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-[9px] text-olive-muted uppercase tracking-widest font-semibold mb-2">
                          Sélectionnez un package
                        </label>
                        <select
                          value={selectedPackage}
                          onChange={(e) => setSelectedPackage(e.target.value)}
                          className="w-full bg-white border-2 border-olive/20 focus:border-lime/50 rounded-xl px-4 py-3 text-olive text-sm focus:outline-none transition-colors"
                        >
                          <option value="">— Choisir un package —</option>
                          {packages.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} ({pkg.companyName || "Sans entreprise"}) - {pkg.scriptType.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleAssignPackage}
                        disabled={!selectedPackage || assigning}
                        className="bg-lime hover:bg-lime-dark disabled:opacity-40 disabled:cursor-not-allowed text-olive font-display tracking-widest text-sm rounded-xl px-8 py-3 transition-all shadow-lg shadow-lime/20 hover:shadow-xl hover:shadow-lime/30 disabled:shadow-none flex items-center gap-2"
                      >
                        {assigning ? (
                          <>
                            <span className="w-4 h-4 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
                            <span>ASSIGNATION...</span>
                          </>
                        ) : (
                          <>
                            <span>✓</span>
                            <span>ASSIGNER AU PACKAGE</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
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
                    onClick={() => handleOpenEdit(expandedEntry.id, activeAngle, expandedEntry.scripts[activeAngle] || "")}
                    className="flex items-center gap-1.5 bg-white border-2 border-olive/15 hover:border-olive/30 text-olive-muted hover:text-olive rounded-xl px-3 py-1.5 text-[10px] font-display tracking-widest transition-all"
                  >
                    ✏ ÉDITER
                  </button>
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

      {/* Script edit modal */}
      {editModal && (
        <div className="fixed inset-0 bg-olive/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cream-card border-2 border-olive/15 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-olive/10 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-display text-lg text-olive tracking-wider">ÉDITER LE SCRIPT</h2>
                <p className="text-olive-muted text-[10px] uppercase tracking-widest mt-0.5">
                  {ANGLE_LABELS[editModal.angle]?.emoji} {ANGLE_LABELS[editModal.angle]?.label}
                </p>
              </div>
              <button onClick={() => setEditModal(null)} className="text-olive-muted hover:text-olive text-xl transition-colors">✕</button>
            </div>

            {/* Textarea */}
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-olive mb-2">
                Contenu du script — éditable directement
              </label>
              <textarea
                value={editModal.content}
                onChange={(e) => setEditModal((prev) => prev ? { ...prev, content: e.target.value } : prev)}
                rows={16}
                className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-4 py-3 text-olive text-sm focus:border-olive transition-colors resize-none font-mono leading-relaxed"
                autoFocus
              />
            </div>

            {/* AI Edit */}
            <div className="px-6 pb-4 shrink-0">
              <div className="bg-cream border-2 border-olive/8 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-olive-muted mb-2">
                  ✦ Modifier avec l&apos;IA
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editAiInstruction}
                    onChange={(e) => setEditAiInstruction(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAiEditHistory()}
                    placeholder="ex: Rends le hook plus percutant, raccourcis la fin…"
                    className="flex-1 bg-cream-input border-2 border-olive/15 rounded-lg px-3 py-2 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors"
                  />
                  <button
                    onClick={handleAiEditHistory}
                    disabled={editAiLoading || !editAiInstruction.trim()}
                    className="bg-olive hover:bg-olive-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-display tracking-widest rounded-lg px-4 py-2 text-sm transition-all min-w-[110px] flex items-center justify-center gap-2"
                  >
                    {editAiLoading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : null}
                    {editAiLoading ? "IA…" : "APPLIQUER"}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3 shrink-0 border-t border-olive/10 pt-4">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 bg-cream-input border-2 border-olive/15 text-olive-muted hover:text-olive rounded-xl py-3 text-sm font-display tracking-widest transition-all"
              >
                ANNULER
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex-1 bg-olive hover:bg-olive-dark disabled:opacity-40 text-white font-display tracking-widest rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2"
              >
                {editSaving ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : null}
                {editSaving ? "SAUVEGARDE…" : "💾 SAUVEGARDER"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
