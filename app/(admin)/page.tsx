"use client";

import { useState, useEffect } from "react";
import type { ScriptType, Duration, ScriptAngle, CostInfo, CompanyRow, PackageRow } from "@/lib/types";
import ScriptRenderer from "@/components/ScriptRenderer";

/* ─── Config ─────────────────────────────────────────────────── */

const SCRIPT_TYPES = [
  { type: "ugc" as ScriptType, label: "UGC", sub: "Témoignage direct", icon: "📱" },
  { type: "micro_trottoir" as ScriptType, label: "MICRO-TROTTOIR", sub: "Interview rue", icon: "🎤" },
  { type: "face_cam" as ScriptType, label: "FACE CAM", sub: "Caméra directe", icon: "👤" },
  { type: "auto" as ScriptType, label: "AUTO", sub: "IA choisit", icon: "✦" },
];

const DURATIONS = [
  { value: "0-15" as Duration, label: "0–15s", sub: "Ultra court" },
  { value: "15-30" as Duration, label: "15–30s", sub: "Court" },
  { value: "30-60" as Duration, label: "30–60s", sub: "Standard" },
  { value: "60-120" as Duration, label: "60–120s", sub: "Long" },
];

const ANGLES = [
  { type: "emotional" as ScriptAngle, label: "ÉMOTIONNEL", emoji: "❤️" },
  { type: "problem_solution" as ScriptAngle, label: "PROBLÈME/SOLUTION", emoji: "🎯" },
  { type: "curiosity" as ScriptAngle, label: "CURIOSITÉ", emoji: "🔥" },
];

/* ─── Page ────────────────────────────────────────────────────── */

export default function Home() {
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [scriptType, setScriptType] = useState<ScriptType>("ugc");
  const [duration, setDuration] = useState<Duration>("30-60");

  // Company & Package selectors
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scripts, setScripts] = useState<Record<ScriptAngle, string> | null>(null);
  const [cost, setCost] = useState<CostInfo | null>(null);
  const [genId, setGenId] = useState<string | null>(null);
  const [scriptIds, setScriptIds] = useState<string[]>([]);

  const [activeAngle, setActiveAngle] = useState<ScriptAngle>("emotional");
  const [copied, setCopied] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [editing, setEditing] = useState(false);
  const [validatedAngle, setValidatedAngle] = useState<ScriptAngle | null>(null);
  const [validateFeedback, setValidateFeedback] = useState<string | null>(null);

  // Manual editing
  const [manualEditing, setManualEditing] = useState(false);
  const [manualContent, setManualContent] = useState("");
  const [manualSaving, setManualSaving] = useState(false);

  // Load companies on mount
  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? []))
      .catch(() => null);
  }, []);

  // Load packages when company changes
  useEffect(() => {
    setSelectedPackageId("");
    if (!selectedCompanyId) { setPackages([]); return; }
    fetch(`/api/packages?companyId=${selectedCompanyId}`)
      .then((r) => r.json())
      .then((d) => setPackages(d.packages ?? []))
      .catch(() => setPackages([]));
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  // Reset manual editing when angle changes
  useEffect(() => {
    setManualEditing(false);
  }, [activeAngle]);

  /* ─── Handlers ──────────────────────────────────────────────── */

  const handleGenerate = async () => {
    if (!url && !niche && !description && !selectedCompanyId) {
      setError("Renseigne au moins un champ pour générer les scripts.");
      return;
    }
    setLoading(true);
    setError("");
    setScripts(null);
    setCost(null);
    setValidatedAngle(null);
    setValidateFeedback(null);
    setGenId(null);
    setScriptIds([]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          niche,
          description,
          instructions,
          scriptType,
          duration,
          companyId: selectedCompanyId || undefined,
          packageId: selectedPackageId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la génération");
      }
      const data = await res.json();
      setScripts(data.scripts);
      setCost(data.cost);
      setGenId(data.id ?? null);
      setScriptIds(data.scriptIds ?? []);
      setActiveAngle("emotional");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editInstruction.trim() || !scripts) return;
    setEditing(true);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: scripts[activeAngle], instruction: editInstruction, scriptType, duration }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setScripts((prev) => prev ? { ...prev, [activeAngle]: data.script } : prev);
      setEditInstruction("");
    } catch { /* silent */ }
    finally { setEditing(false); }
  };

  const handleToggleManualEdit = () => {
    if (!scripts) return;
    if (!manualEditing) {
      setManualContent(scripts[activeAngle]);
      setManualEditing(true);
    } else {
      setManualEditing(false);
    }
  };

  const handleSaveManual = async () => {
    if (!scripts || !manualContent) return;
    setManualSaving(true);
    try {
      setScripts((prev) => prev ? { ...prev, [activeAngle]: manualContent } : prev);
      const angleIndex = ANGLES.findIndex((a) => a.type === activeAngle);
      const scriptId = scriptIds[angleIndex];
      if (scriptId) {
        await fetch(`/api/scripts/${scriptId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: manualContent }),
        }).catch(() => null);
      } else if (genId) {
        await fetch("/api/history", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: genId, angle: activeAngle, content: manualContent }),
        }).catch(() => null);
      }
      setManualEditing(false);
    } finally {
      setManualSaving(false);
    }
  };

  const copyScript = async () => {
    if (!scripts) return;
    await navigator.clipboard.writeText(scripts[activeAngle]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAll = () => {
    if (!scripts) return;
    const content = ANGLES.map(
      (a) => `${"=".repeat(40)}\n${a.emoji} ${a.label}\n${"=".repeat(40)}\n\n${scripts[a.type]}`
    ).join("\n\n\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `scripts-ugc-${new Date().toISOString().split("T")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleValidate = async (angle: ScriptAngle) => {
    // Validate via script entity if we have scriptIds, else via legacy generation
    const angleIndex = ANGLES.findIndex((a) => a.type === angle);
    const scriptId = scriptIds[angleIndex];

    const newVal = validatedAngle === angle ? null : angle;

    if (scriptId && newVal) {
      // Mark the specific script as validated
      await fetch(`/api/scripts/${scriptId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "validated" }),
      }).catch(() => null);
    } else if (genId) {
      // Legacy: mark validation on generation
      await fetch("/api/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: genId, validated: newVal }),
      }).catch(() => null);
    }

    setValidatedAngle(newVal);
    if (newVal) {
      const label = ANGLES.find(a => a.type === newVal)?.label ?? newVal;
      setValidateFeedback(`Script "${label}" validé ✓`);
    } else {
      setValidateFeedback("Validation retirée");
    }
    setTimeout(() => setValidateFeedback(null), 2500);
  };

  const currentAngle = ANGLES.find((a) => a.type === activeAngle)!;

  /* ─── Render ─────────────────────────────────────────────────── */

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {/* ── LEFT PANEL: Form ─────────────────────────────────────── */}
      <div className="w-[380px] shrink-0 bg-cream-card border-r border-olive/10 flex flex-col overflow-y-auto">

        {/* Panel header */}
        <div className="px-6 pt-7 pb-5 border-b border-olive/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-lime inline-block" />
            <span className="text-olive-muted text-[10px] uppercase tracking-[0.2em] font-semibold">
              Générateur de scripts
            </span>
          </div>
          <h1 className="font-display text-3xl text-olive tracking-wider leading-none">
            NOUVEAU SCRIPT
          </h1>
        </div>

        <div className="px-6 py-5 space-y-6 flex-1">

          {/* ── COMPANY SELECTOR ── */}
          <section>
            <FieldLabel>Entreprise cliente</FieldLabel>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="mt-2 w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3.5 py-2.5 text-olive text-sm focus:border-olive transition-colors"
            >
              <option value="">— Génération libre (sans entreprise) —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.domain} {c.niche ? `· ${c.niche}` : ""}
                </option>
              ))}
            </select>

            {/* Company profile badge */}
            {selectedCompany && (
              <div className="mt-2 bg-lime/10 border border-lime/30 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-dark inline-block" />
                  <span className="text-[9px] font-display tracking-widest text-olive uppercase">
                    PROFIL CHARGÉ — Génération intelligente active
                  </span>
                </div>
                {selectedCompany.communicationStyle && (
                  <p className="text-[10px] text-olive-muted">Style : {selectedCompany.communicationStyle}</p>
                )}
                {selectedCompany.targetAudience && (
                  <p className="text-[10px] text-olive-muted">Cible : {selectedCompany.targetAudience}</p>
                )}
              </div>
            )}
          </section>

          {/* ── PACKAGE SELECTOR ── */}
          {selectedCompanyId && packages.length > 0 && (
            <section>
              <FieldLabel>Package <Opt /></FieldLabel>
              <select
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                className="mt-2 w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3.5 py-2.5 text-olive text-sm focus:border-olive transition-colors"
              >
                <option value="">— Aucun package —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </section>
          )}

          {/* Script type */}
          <section>
            <FieldLabel>Type de script</FieldLabel>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {SCRIPT_TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => setScriptType(t.type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all duration-150 ${
                    scriptType === t.type
                      ? "bg-olive border-olive text-lime"
                      : "bg-cream-input border-olive/15 text-olive-muted hover:border-olive/30 hover:text-olive"
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span
                    className={`text-[10px] font-display tracking-wider ${
                      scriptType === t.type ? "text-lime" : "text-olive"
                    }`}
                  >
                    {t.label}
                  </span>
                  <span className="text-[9px] opacity-50 font-sans">{t.sub}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Duration */}
          <section>
            <FieldLabel>Durée cible</FieldLabel>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`flex flex-col items-center py-3 px-1 rounded-xl border-2 text-center transition-all duration-150 ${
                    duration === d.value
                      ? "bg-olive border-olive text-lime"
                      : "bg-cream-input border-olive/15 text-olive-muted hover:border-olive/30 hover:text-olive"
                  }`}
                >
                  <span
                    className={`text-[10px] font-display tracking-wider leading-none ${
                      duration === d.value ? "text-lime" : "text-olive"
                    }`}
                  >
                    {d.label}
                  </span>
                  <span className="text-[9px] opacity-50 mt-0.5 font-sans">{d.sub}</span>
                </button>
              ))}
            </div>
          </section>

          {/* URL */}
          <section>
            <FieldLabel>URL du produit <Opt /></FieldLabel>
            <div className="relative mt-2">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-olive-light text-sm pointer-events-none">
                🔗
              </span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mon-produit.com"
                className="w-full bg-cream-input border-2 border-olive/15 rounded-xl pl-9 pr-4 py-2.5 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors"
              />
            </div>
          </section>

          {/* Niche + Description */}
          <div className="grid grid-cols-2 gap-3">
            <section>
              <FieldLabel>Niche <Opt /></FieldLabel>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="skincare, SaaS…"
                className="mt-2 w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3.5 py-2.5 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors"
              />
            </section>
            <section>
              <FieldLabel>Description <Opt /></FieldLabel>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="crème anti-âge…"
                className="mt-2 w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3.5 py-2.5 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors"
              />
            </section>
          </div>

          {/* Instructions */}
          <section>
            <FieldLabel>Instructions spécifiques <Opt /></FieldLabel>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="ex: Ton décontracté, public 25-35 ans, mentionner la livraison gratuite…"
              rows={3}
              className="mt-2 w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3.5 py-2.5 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors resize-none"
            />
          </section>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Generate CTA */}
        <div className="px-6 pb-6 pt-3 border-t border-olive/10">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-olive hover:bg-olive-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-display tracking-widest text-lg rounded-xl py-4 transition-all duration-200 flex items-center justify-center gap-3"
          >
            {loading ? (
              <><Spinner /><span>GÉNÉRATION EN COURS…</span></>
            ) : (
              <>
                <span>GÉNÉRER LES SCRIPTS</span>
                <span className="text-lime">{selectedCompanyId ? "★" : "✦"}</span>
              </>
            )}
          </button>
          {selectedCompanyId ? (
            <p className="text-center text-lime-dark text-[10px] mt-2.5 uppercase tracking-widest">
              Génération intelligente · Profil {selectedCompany?.name} chargé
            </p>
          ) : (
            <p className="text-center text-olive-light text-[10px] mt-2.5 uppercase tracking-widest">
              ~$0.002 par génération · Budget $5/mois
            </p>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Output ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!scripts ? (
          /* Empty state */
          <div className="flex items-center justify-center h-full">
            <div className="text-center select-none">
              <div className="w-20 h-20 rounded-2xl bg-olive/8 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl opacity-40">🎬</span>
              </div>
              <h3 className="font-display text-2xl text-olive tracking-wider mb-2">
                PRÊT À GÉNÉRER
              </h3>
              <p className="text-olive-muted text-sm max-w-[280px] mx-auto leading-relaxed">
                {companies.length > 0
                  ? "Sélectionne une entreprise pour une génération intelligente, ou génère librement"
                  : "Configure le formulaire et clique sur GÉNÉRER LES SCRIPTS"}
              </p>
              {companies.length === 0 && (
                <p className="text-olive-light text-xs mt-3">
                  💡 Crée une entreprise dans{" "}
                  <a href="/companies" className="underline hover:text-olive transition-colors">
                    Entreprises
                  </a>{" "}
                  pour des scripts encore plus précis
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Scripts output */
          <div className="p-7 space-y-5 animate-fade-in">

            {/* Top bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              {cost && (
                <div className="flex items-center gap-3 bg-white border border-olive/10 rounded-xl px-4 py-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime inline-block" />
                  <span className="text-olive-muted uppercase tracking-widest text-[10px]">Cette génération</span>
                  <span className="text-olive font-mono font-semibold">${cost.thisRequest.toFixed(5)}</span>
                  <span className="w-px h-3 bg-olive/10" />
                  <span className="text-olive-muted uppercase tracking-widest text-[10px]">Ce mois</span>
                  <span className="text-olive-muted font-mono">${cost.totalThisMonth.toFixed(4)}</span>
                  <span className="w-px h-3 bg-olive/10" />
                  <span className="text-olive-light text-[10px]">{cost.inputTokens + cost.outputTokens} tokens</span>
                  {selectedCompany && (
                    <>
                      <span className="w-px h-3 bg-olive/10" />
                      <span className="text-lime-dark text-[10px]">★ {selectedCompany.name}</span>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-2 bg-white hover:bg-cream-card border-2 border-olive/15 hover:border-olive/30 text-olive-muted hover:text-olive rounded-xl px-4 py-2 text-[10px] font-sans uppercase tracking-widest font-medium transition-all disabled:opacity-40"
              >
                {loading ? <Spinner /> : "↺"}
                RÉGÉNÉRER
              </button>
            </div>

            {/* Validation feedback toast */}
            {validateFeedback && (
              <div className="flex items-center gap-2 bg-olive text-lime border border-lime/30 rounded-xl px-4 py-2.5 text-xs font-display tracking-widest animate-fade-in">
                <span>✓</span> {validateFeedback}
              </div>
            )}

            {/* Validation status banner */}
            {validatedAngle && (
              <div className="flex items-center gap-3 bg-lime/15 border-2 border-lime/40 rounded-xl px-4 py-2.5">
                <span>✓</span>
                <div>
                  <span className="text-olive font-display tracking-wider text-sm">
                    SCRIPT {ANGLES.find(a => a.type === validatedAngle)?.label} VALIDÉ
                  </span>
                  <span className="text-olive-muted text-[10px] ml-2">
                    — {selectedCompanyId ? "Enrichit l'apprentissage pour ce client" : "Sauvegardé dans l'historique"}
                  </span>
                </div>
              </div>
            )}

            {/* Angle tabs */}
            <div className="flex gap-2">
              {ANGLES.map((a) => {
                const isValidated = validatedAngle === a.type;
                return (
                  <button
                    key={a.type}
                    onClick={() => setActiveAngle(a.type)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-xs font-display tracking-widest transition-all duration-150 ${
                      activeAngle === a.type
                        ? "bg-olive border-olive text-lime"
                        : isValidated
                        ? "bg-lime/10 border-lime/40 text-olive hover:bg-lime/15"
                        : "bg-white border-olive/15 text-olive-muted hover:border-olive/30 hover:text-olive"
                    }`}
                  >
                    <span>{a.emoji}</span>
                    <span className="hidden sm:inline">{a.label}</span>
                    {isValidated && (
                      <span className={`text-[9px] font-bold ${activeAngle === a.type ? "text-lime" : "text-lime-dark"}`}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Script card */}
            <div className="bg-white border-2 border-olive/10 rounded-2xl overflow-hidden">

              {/* Card header */}
              <div className="px-5 py-4 border-b border-olive/8 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-olive flex items-center justify-center">
                    <span className="text-sm">{currentAngle.emoji}</span>
                  </div>
                  <div>
                    <div className="font-display text-olive tracking-wider text-base leading-none">
                      {currentAngle.label}
                    </div>
                    <div className="text-olive-light text-[10px] uppercase tracking-widest mt-0.5">
                      {SCRIPT_TYPES.find(t => t.type === scriptType)?.label} · {duration}s
                      {selectedCompany && ` · ${selectedCompany.name}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <OutlineBtn onClick={copyScript}>
                    {copied ? <span className="text-lime-dark">✓ COPIÉ</span> : "📋 COPIER"}
                  </OutlineBtn>
                  <OutlineBtn onClick={downloadAll}>⬇ EXPORT .TXT</OutlineBtn>
                  {validatedAngle === activeAngle ? (
                    <button
                      onClick={() => handleValidate(activeAngle)}
                      disabled={!genId && scriptIds.length === 0}
                      className="flex items-center gap-1.5 bg-lime/20 border-2 border-lime/50 text-olive hover:bg-red-50 hover:border-red-300 hover:text-red-500 rounded-xl px-3 py-1.5 text-[10px] font-display tracking-widest transition-all disabled:opacity-40"
                    >
                      ✓ VALIDÉ — RETIRER
                    </button>
                  ) : (
                    <OutlineBtn
                      onClick={() => handleValidate(activeAngle)}
                      disabled={!genId && scriptIds.length === 0}
                      highlight
                    >
                      {validatedAngle ? "⇄ CHANGER" : "✓ VALIDER"}
                    </OutlineBtn>
                  )}
                  <OutlineBtn onClick={handleToggleManualEdit}>
                    {manualEditing ? "✕ ANNULER ÉDITION" : "✏ ÉDITER"}
                  </OutlineBtn>
                </div>
              </div>

              {/* Script body */}
              <div className="p-5">
                {manualEditing ? (
                  <textarea
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    rows={18}
                    autoFocus
                    className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-4 py-3 text-olive text-sm focus:border-olive transition-colors resize-none font-mono leading-relaxed"
                  />
                ) : (
                  <ScriptRenderer content={scripts[activeAngle]} />
                )}
              </div>

              {/* Manual edit save toolbar */}
              {manualEditing && (
                <div className="px-5 pb-4 flex gap-2">
                  <button
                    onClick={() => setManualEditing(false)}
                    className="flex-1 bg-cream-input border-2 border-olive/15 text-olive-muted hover:text-olive rounded-xl py-2.5 text-[10px] font-display tracking-widest transition-all"
                  >
                    ANNULER
                  </button>
                  <button
                    onClick={handleSaveManual}
                    disabled={manualSaving}
                    className="flex-1 bg-olive hover:bg-olive-dark disabled:opacity-40 text-white font-display tracking-widest rounded-xl py-2.5 text-[10px] transition-all flex items-center justify-center gap-2"
                  >
                    {manualSaving ? <Spinner /> : null}
                    {manualSaving ? "SAUVEGARDE…" : "💾 SAUVEGARDER"}
                  </button>
                </div>
              )}

              {/* AI Edit */}
              <div className="px-5 pb-5">
                <div className="bg-cream-card border-2 border-olive/8 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-olive-muted mb-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">✦ Modifier avec l&apos;IA</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editInstruction}
                      onChange={(e) => setEditInstruction(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                      placeholder="ex: Rends le hook plus percutant, ajoute une stat choc…"
                      className="flex-1 bg-cream-input border-2 border-olive/15 rounded-lg px-3 py-2 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors"
                    />
                    <button
                      onClick={handleEdit}
                      disabled={editing || !editInstruction.trim()}
                      className="bg-olive hover:bg-olive-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-display tracking-widest rounded-lg px-4 py-2 text-sm transition-all flex items-center gap-2 min-w-[100px] justify-center"
                    >
                      {editing ? <Spinner /> : "APPLIQUER"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="px-5 pb-5 flex flex-wrap gap-2">
                {["● Hook fort", "● Ton naturel", "● Prêt à tourner"].map((tag) => (
                  <span
                    key={tag}
                    className="bg-cream border border-olive/15 text-olive-muted text-[10px] uppercase tracking-widest rounded-full px-3 py-1 font-sans"
                  >
                    {tag}
                  </span>
                ))}
                {selectedCompanyId && (
                  <span className="bg-lime/15 border border-lime/30 text-olive text-[10px] uppercase tracking-widest rounded-full px-3 py-1 font-sans">
                    ★ Génération intelligente
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-olive text-[10px] font-semibold uppercase tracking-[0.2em]">
      {children}
    </div>
  );
}

function Opt() {
  return <span className="text-olive-light normal-case font-normal">(opt.)</span>;
}

function OutlineBtn({
  children,
  onClick,
  disabled,
  highlight,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 border-2 rounded-xl px-3 py-1.5 text-[10px] font-display tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        highlight
          ? "bg-lime/10 border-lime/50 text-olive hover:bg-lime/20"
          : "bg-white border-olive/15 text-olive-muted hover:border-olive/30 hover:text-olive"
      }`}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
