"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import type { CompanyRow, PackageRow, ScriptRow, HistoryEntry, ScriptType, PackageStatus, ReferenceScriptRow, ShareTokenRow } from "@/lib/types";
import { stripMarkdown } from "@/components/ScriptContent";

const CONTENT_TYPES: { value: ScriptType; label: string; icon: string }[] = [
  { value: "ugc", label: "UGC", icon: "📱" },
  { value: "micro_trottoir", label: "MICRO-TROTTOIR", icon: "🎤" },
  { value: "face_cam", label: "FACE CAM", icon: "👤" },
  { value: "auto", label: "AUTO", icon: "✦" },
];

const STATUS_CONFIG: Record<PackageStatus, { label: string; color: string }> = {
  active: { label: "ACTIF", color: "bg-lime/20 text-olive border-lime/30" },
  filming: { label: "EN TOURNAGE", color: "bg-orange-100 text-orange-700 border-orange-200" },
  completed: { label: "TERMINÉ", color: "bg-olive/10 text-olive-muted border-olive/20" },
};

const SCRIPT_STATUS_CONFIG = {
  generated: { label: "GÉNÉRÉ", color: "bg-cream border-olive/15 text-olive-muted" },
  validated: { label: "VALIDÉ", color: "bg-lime/20 border-lime/30 text-olive" },
  in_production: { label: "EN PROD", color: "bg-orange-100 border-orange-200 text-orange-700" },
  filmed: { label: "FILMÉ", color: "bg-olive/15 border-olive/20 text-olive" },
};

const ANGLE_LABELS = {
  emotional: { label: "ÉMOTIONNEL", emoji: "❤️" },
  problem_solution: { label: "PROBLÈME/SOL.", emoji: "🎯" },
  curiosity: { label: "CURIOSITÉ", emoji: "🔥" },
};

type Tab = "profil" | "packages" | "scripts" | "scripts_valides" | "modeles";

/* ─── Page ──────────────────────────────────────────────────── */

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [scripts, setScripts] = useState<ScriptRow[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [referenceScripts, setReferenceScripts] = useState<ReferenceScriptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("profil");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCreatePackage, setShowCreatePackage] = useState(false);
  const [editingScript, setEditingScript] = useState<ScriptRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editAiInstruction, setEditAiInstruction] = useState("");
  const [editAiLoading, setEditAiLoading] = useState(false);
  const [assigningPackages, setAssigningPackages] = useState<Record<string, string>>({});

  // Share modal
  const [shareScript, setShareScript] = useState<ScriptRow | null>(null);
  const [shareTokens, setShareTokens] = useState<ShareTokenRow[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCreating, setShareCreating] = useState(false);
  const [shareCopied, setShareCopied] = useState<string | null>(null);

  // AI autofill
  const [autofilling, setAutofilling] = useState(false);
  const [autofillSuggestions, setAutofillSuggestions] = useState<{
    niche?: string;
    description?: string;
    communicationStyle?: string;
    targetAudience?: string;
    servicesProducts?: string;
    brandVoice?: string;
  } | null>(null);

  // Editable form state
  const [form, setForm] = useState({
    name: "",
    niche: "",
    description: "",
    communicationStyle: "",
    targetAudience: "",
    servicesProducts: "",
    brandVoice: "",
    contentTypes: [] as ScriptType[],
  });

  useEffect(() => {
    fetch(`/api/companies/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCompany(d.company);
        setPackages(d.packages ?? []);
        setScripts(d.scripts ?? []);
        setHistory(d.history ?? []);
        setReferenceScripts(d.referenceScripts ?? []);
        if (d.company) {
          setForm({
            name: d.company.name ?? "",
            niche: d.company.niche ?? "",
            description: d.company.description ?? "",
            communicationStyle: d.company.communicationStyle ?? "",
            targetAudience: d.company.targetAudience ?? "",
            servicesProducts: d.company.servicesProducts ?? "",
            brandVoice: d.company.brandVoice ?? "",
            contentTypes: d.company.contentTypes ?? [],
          });
        }
      })
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const d = await res.json();
        setCompany(d.company);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenShare = async (s: ScriptRow) => {
    setShareScript(s);
    setShareLoading(true);
    setShareTokens([]);
    try {
      const res = await fetch(`/api/scripts/${s.id}/share`);
      const d = await res.json();
      setShareTokens(d.tokens ?? []);
    } catch { /* silent */ }
    finally { setShareLoading(false); }
  };

  const handleCreateShare = async () => {
    if (!shareScript) return;
    setShareCreating(true);
    try {
      const res = await fetch(`/api/scripts/${shareScript.id}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const d = await res.json();
      setShareTokens((prev) => [d.token, ...prev]);
    } catch { /* silent */ }
    finally { setShareCreating(false); }
  };

  const handleRevokeShare = async (token: string) => {
    await fetch(`/api/scripts/${shareScript?.id}/share`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setShareTokens((prev) => prev.filter((t) => t.token !== token));
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setShareCopied(url);
    setTimeout(() => setShareCopied(null), 2000);
  };

  const handleAutofill = async () => {
    setAutofilling(true);
    setAutofillSuggestions(null);
    try {
      const res = await fetch(`/api/companies/${id}/autofill`, { method: "POST" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setAutofillSuggestions(d.suggestions);
    } catch { /* silent */ }
    finally { setAutofilling(false); }
  };

  const handleApplySuggestions = () => {
    if (!autofillSuggestions) return;
    setForm((prev) => ({
      ...prev,
      niche: autofillSuggestions.niche || prev.niche,
      description: autofillSuggestions.description || prev.description,
      communicationStyle: autofillSuggestions.communicationStyle || prev.communicationStyle,
      targetAudience: autofillSuggestions.targetAudience || prev.targetAudience,
      servicesProducts: autofillSuggestions.servicesProducts || prev.servicesProducts,
      brandVoice: autofillSuggestions.brandVoice || prev.brandVoice,
    }));
    setAutofillSuggestions(null);
  };

  const toggleType = (t: ScriptType) => {
    setForm((prev) => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(t)
        ? prev.contentTypes.filter((x) => x !== t)
        : [...prev.contentTypes, t],
    }));
  };

  const handleScriptStatus = async (scriptId: string, status: string) => {
    await fetch(`/api/scripts/${scriptId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setScripts((prev) =>
      prev.map((s) => (s.id === scriptId ? { ...s, status: status as ScriptRow["status"] } : s))
    );
  };

  const handleAssignPackage = async (scriptId: string, packageId: string) => {
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: packageId || null }),
      });
      if (!res.ok) throw new Error();
      const packageName = packages.find((p) => p.id === packageId)?.name ?? null;
      setScripts((prev) =>
        prev.map((s) => 
          s.id === scriptId 
            ? { ...s, packageId: packageId || null, packageName } 
            : s
        )
      );
      setAssigningPackages((prev) => {
        const updated = { ...prev };
        delete updated[scriptId];
        return updated;
      });
    } catch {
      alert("Erreur lors de l'assignation au package");
    }
  };

  const handleOpenEdit = (s: ScriptRow) => {
    setEditingScript(s);
    setEditContent(s.content ?? "");
    setEditAiInstruction("");
  };

  const handleSaveEdit = async () => {
    if (!editingScript) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/scripts/${editingScript.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error();
      setScripts((prev) => prev.map((s) => s.id === editingScript.id ? { ...s, content: editContent } : s));
      setEditingScript(null);
    } catch { /* silent */ }
    finally { setEditSaving(false); }
  };

  const handleAiEdit = async () => {
    if (!editAiInstruction.trim() || !editingScript) return;
    setEditAiLoading(true);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: editContent,
          instruction: editAiInstruction,
          scriptType: editingScript.angle,
          duration: "30-60",
        }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setEditContent(d.script);
      setEditAiInstruction("");
    } catch { /* silent */ }
    finally { setEditAiLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-olive-muted text-sm uppercase tracking-widest">
        Chargement…
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-olive-muted mb-4">Entreprise introuvable</p>
          <Link href="/companies" className="text-olive underline text-sm">← Retour</Link>
        </div>
      </div>
    );
  }

  const validatedCount = scripts.filter((s) => ["validated", "in_production", "filmed"].includes(s.status)).length;
  const profileScore = [
    company.description,
    company.communicationStyle,
    company.targetAudience,
    company.servicesProducts,
    company.brandVoice,
    company.contentTypes?.length,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cream">
      {/* Header */}
      <div className="bg-cream-card border-b border-olive/10 px-8 py-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/companies" className="text-olive-muted hover:text-olive text-sm transition-colors">
            ← Entreprises
          </Link>
          <span className="text-olive/20">/</span>
          <div>
            <h1 className="font-display text-2xl text-olive tracking-wider">{company.name ?? company.domain}</h1>
            <p className="text-olive-muted text-xs">{company.domain} · {company.niche && <span className="text-lime-dark">{company.niche}</span>}</p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6">
          <Stat label="Générations" value={history.length} />
          <Stat label="Validés" value={validatedCount} accent />
          <Stat label="Packages" value={packages.length} />
          <div className="text-center">
            <div className="font-display text-olive text-base tracking-wider">{profileScore}/6</div>
            <div className="text-olive-light text-[9px] uppercase tracking-widest">Profil</div>
            <div className="w-12 h-1 bg-olive/10 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full rounded-full bg-lime transition-all"
                style={{ width: `${(profileScore / 6) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-cream-card border-b border-olive/10 px-8 flex gap-1 shrink-0">
        {(["profil", "packages", "scripts", "scripts_valides", "modeles"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-[10px] font-display tracking-widest uppercase border-b-2 transition-all ${
              tab === t
                ? "border-olive text-olive"
                : "border-transparent text-olive-muted hover:text-olive"
            }`}
          >
            {t === "profil" && "◈ PROFIL"}
            {t === "packages" && `▦ PACKAGES (${packages.length})`}
            {t === "scripts" && `✓ SCRIPTS (${scripts.length})`}
            {t === "scripts_valides" && `⭐ VALIDÉS (${scripts.filter((s) => ["validated", "in_production", "filmed"].includes(s.status)).length})`}
            {t === "modeles" && `◎ MODÈLES (${referenceScripts.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* ── PROFIL TAB ──────────────────────────────────────── */}
        {tab === "profil" && (
          <div className="max-w-2xl space-y-5">
            {saved && (
              <div className="flex items-center gap-2 bg-olive text-lime rounded-xl px-4 py-3 text-sm font-display tracking-widest animate-fade-in">
                ✓ Profil sauvegardé — sera utilisé pour les prochaines générations
              </div>
            )}

            {/* AI Autofill banner */}
            <div className="bg-gradient-to-r from-lime/15 to-lime/5 border-2 border-lime/30 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✦</span>
                  <div>
                    <div className="font-display text-olive tracking-wider text-sm">REMPLISSAGE AUTOMATIQUE PAR L&apos;IA</div>
                    <p className="text-olive-muted text-xs mt-0.5 leading-relaxed">
                      L&apos;IA analyse <strong className="text-olive">{company.name ?? company.domain}</strong> et propose un profil marketing complet. Tu peux ensuite modifier chaque champ.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAutofill}
                  disabled={autofilling}
                  className="shrink-0 bg-olive hover:bg-olive-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-display tracking-widest text-xs rounded-xl px-5 py-3 transition-all flex items-center gap-2"
                >
                  {autofilling ? (
                    <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> ANALYSE EN COURS…</>
                  ) : (
                    <>✦ REMPLIR AVEC L&apos;IA</>
                  )}
                </button>
              </div>

              {/* Suggestions preview */}
              {autofillSuggestions && (
                <div className="mt-4 border-t border-lime/20 pt-4 space-y-3">
                  <div className="text-[10px] font-display tracking-widest text-olive-muted uppercase mb-2">
                    ✓ Suggestions générées — vérifie et applique :
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(autofillSuggestions).map(([key, value]) => {
                      const labels: Record<string, string> = {
                        niche: "Niche / Secteur",
                        description: "Description",
                        communicationStyle: "Style de communication",
                        targetAudience: "Cible principale",
                        servicesProducts: "Produits / Services",
                        brandVoice: "Personnalité de marque",
                      };
                      return value ? (
                        <div key={key} className="bg-white/70 rounded-xl px-3 py-2.5 border border-lime/20">
                          <div className="text-[9px] font-display tracking-widest text-olive-muted uppercase mb-1">{labels[key] ?? key}</div>
                          <p className="text-xs text-olive leading-relaxed">{value}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setAutofillSuggestions(null)}
                      className="flex-1 bg-cream-input border-2 border-olive/15 text-olive-muted hover:text-olive rounded-xl py-2.5 text-[10px] font-display tracking-widest transition-all"
                    >
                      IGNORER
                    </button>
                    <button
                      onClick={handleApplySuggestions}
                      className="flex-1 bg-olive hover:bg-olive-dark text-white font-display tracking-widest rounded-xl py-2.5 text-[10px] transition-all"
                    >
                      ✓ APPLIQUER TOUTES LES SUGGESTIONS
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border-2 border-olive/10 rounded-2xl p-6 space-y-5">
              <SectionTitle>Identité</SectionTitle>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nom de l'entreprise">
                  <Input value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Studio Savora" />
                </Field>
                <Field label="Niche / Secteur">
                  <Input value={form.niche} onChange={(v) => setForm((p) => ({ ...p, niche: v }))} placeholder="skincare, SaaS…" />
                </Field>
              </div>

              <Field label="Description de la marque">
                <Textarea
                  value={form.description}
                  onChange={(v) => setForm((p) => ({ ...p, description: v }))}
                  placeholder="Qui sont-ils ? Que font-ils ? Quelle est leur mission ?"
                  rows={3}
                />
              </Field>
            </div>

            <div className="bg-white border-2 border-olive/10 rounded-2xl p-6 space-y-5">
              <SectionTitle>Communication & Audience</SectionTitle>

              <Field label="Style de communication">
                <Input
                  value={form.communicationStyle}
                  onChange={(v) => setForm((p) => ({ ...p, communicationStyle: v }))}
                  placeholder="Ex: Casual et engagé, Expert et sérieux, Humour et proximité…"
                />
              </Field>

              <Field label="Cible principale">
                <Input
                  value={form.targetAudience}
                  onChange={(v) => setForm((p) => ({ ...p, targetAudience: v }))}
                  placeholder="Ex: Femmes 25-45 ans actives, Hommes 18-35 ans gamers…"
                />
              </Field>

              <Field label="Personnalité de marque (brand voice)">
                <Input
                  value={form.brandVoice}
                  onChange={(v) => setForm((p) => ({ ...p, brandVoice: v }))}
                  placeholder="Ex: Bienveillante, ambitieuse, disruptive, authentique…"
                />
              </Field>
            </div>

            <div className="bg-white border-2 border-olive/10 rounded-2xl p-6 space-y-5">
              <SectionTitle>Produits & Contenu</SectionTitle>

              <Field label="Produits / Services">
                <Textarea
                  value={form.servicesProducts}
                  onChange={(v) => setForm((p) => ({ ...p, servicesProducts: v }))}
                  placeholder="Décris ce qu'ils vendent : produits phares, gamme, prix, différenciants…"
                  rows={3}
                />
              </Field>

              <div>
                <Label>Types de contenu préférés</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {CONTENT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => toggleType(t.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-[10px] font-display tracking-widest transition-all ${
                        form.contentTypes.includes(t.value)
                          ? "bg-olive border-olive text-lime"
                          : "bg-cream-input border-olive/15 text-olive-muted hover:border-olive/30"
                      }`}
                    >
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-olive hover:bg-olive-dark disabled:opacity-50 text-white font-display tracking-widest text-sm rounded-xl px-6 py-3 transition-all"
              >
                {saving ? "SAUVEGARDE…" : "✓ SAUVEGARDER LE PROFIL"}
              </button>
            </div>
          </div>
        )}

        {/* ── PACKAGES TAB ─────────────────────────────────── */}
        {tab === "packages" && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl text-olive tracking-wider">PACKAGES</h2>
              <button
                onClick={() => setShowCreatePackage(true)}
                className="flex items-center gap-2 bg-olive hover:bg-olive-dark text-white font-display tracking-widest text-sm rounded-xl px-4 py-2.5 transition-all"
              >
                + NOUVEAU PACKAGE
              </button>
            </div>

            {packages.length === 0 ? (
              <EmptyState icon="▦" title="AUCUN PACKAGE" description="Crée un package pour organiser les scripts de ce client" />
            ) : (
              <div className="space-y-3">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-white border-2 border-olive/10 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-display text-olive text-lg tracking-wider">{pkg.name}</h3>
                          <span className={`text-[9px] font-display tracking-widest px-2 py-0.5 rounded-full border ${STATUS_CONFIG[pkg.status].color}`}>
                            {STATUS_CONFIG[pkg.status].label}
                          </span>
                        </div>
                        <p className="text-olive-muted text-xs">
                          {pkg.scriptType.toUpperCase().replace("_", " ")} · {pkg.totalScripts ?? 0}/{pkg.scriptCount} scripts
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {(["active", "filming", "completed"] as PackageStatus[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              fetch(`/api/packages/${pkg.id}/status`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: s }),
                              }).then(() =>
                                setPackages((prev) =>
                                  prev.map((p) => (p.id === pkg.id ? { ...p, status: s } : p))
                                )
                              );
                            }}
                            className={`text-[9px] font-display tracking-widest px-2.5 py-1.5 rounded-lg border-2 transition-all ${
                              pkg.status === s
                                ? STATUS_CONFIG[s].color
                                : "border-olive/10 text-olive-light hover:border-olive/30"
                            }`}
                          >
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {pkg.scriptCount > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[9px] text-olive-light mb-1">
                          <span>{pkg.validatedCount ?? 0} validés</span>
                          <span>{pkg.filmedCount ?? 0} filmés</span>
                        </div>
                        <div className="h-1.5 bg-olive/8 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-lime rounded-full transition-all"
                            style={{ width: `${Math.min(100, ((pkg.filmedCount ?? 0) / pkg.scriptCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SCRIPTS TAB ──────────────────────────────────── */}
        {tab === "scripts" && (
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl text-olive tracking-wider">
                SCRIPTS ({scripts.length})
              </h2>
              <Link
                href={`/?companyId=${id}`}
                className="flex items-center gap-2 bg-lime/15 hover:bg-lime/25 border-2 border-lime/30 text-olive font-display tracking-widest text-sm rounded-xl px-4 py-2.5 transition-all"
              >
                ✦ GÉNÉRER POUR CE CLIENT
              </Link>
            </div>

            {scripts.length === 0 ? (
              <EmptyState
                icon="✦"
                title="AUCUN SCRIPT"
                description="Génère des scripts pour ce client depuis la page Générer"
              />
            ) : (
              <div className="space-y-2">
                {scripts.map((s) => {
                  const isValidated = ["validated", "in_production", "filmed"].includes(s.status);
                  const selectedPackageId = assigningPackages[s.id] ?? s.packageId ?? "";
                  
                  return (
                    <div key={s.id} className="bg-white border-2 border-olive/10 rounded-xl p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-base">{ANGLE_LABELS[s.angle]?.emoji}</span>
                          <div>
                            <div className="text-[9px] font-display tracking-widest text-olive-muted">
                              {ANGLE_LABELS[s.angle]?.label}
                            </div>
                            {s.packageName && (
                              <div className="text-[9px] text-lime-dark font-semibold">📦 {s.packageName}</div>
                            )}
                          </div>
                        </div>

                        <p className="flex-1 text-xs text-olive-muted line-clamp-2 leading-relaxed">
                          {stripMarkdown(s.content).slice(0, 150) || "—"}
                        </p>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-display tracking-widest px-2 py-1 rounded-lg border ${(SCRIPT_STATUS_CONFIG[s.status] ?? SCRIPT_STATUS_CONFIG.generated).color}`}>
                            {(SCRIPT_STATUS_CONFIG[s.status] ?? SCRIPT_STATUS_CONFIG.generated).label}
                          </span>
                          <select
                            value={s.status}
                            onChange={(e) => handleScriptStatus(s.id, e.target.value)}
                            className="text-[10px] bg-cream-input border border-olive/15 rounded-lg px-2 py-1 text-olive-muted focus:outline-none focus:border-olive"
                          >
                            <option value="generated">Généré</option>
                            <option value="validated">Validé</option>
                            <option value="in_production">En production</option>
                            <option value="filmed">Filmé</option>
                          </select>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="text-[9px] font-display tracking-widest border border-olive/15 hover:border-olive/30 text-olive-muted hover:text-olive rounded-lg px-2.5 py-1.5 transition-all"
                          >
                            ✏ ÉDITER
                          </button>
                          <button
                            onClick={() => handleOpenShare(s)}
                            className="text-[9px] font-display tracking-widest border border-olive/15 hover:border-lime/40 text-olive-muted hover:text-olive rounded-lg px-2.5 py-1.5 transition-all"
                            title="Partager avec le client"
                          >
                            🔗 PARTAGER
                          </button>
                        </div>
                      </div>

                      {/* Package assignment section - Enhanced visibility */}
                      {isValidated && packages.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-lime/10 bg-gradient-to-r from-lime/5 to-transparent rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-lg shrink-0">📦</span>
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-[9px] text-olive-muted font-display tracking-widest shrink-0">
                                {s.packageId ? "PACKAGE:" : "AJOUTER AU PACKAGE:"}
                              </span>
                              <select
                                value={selectedPackageId}
                                onChange={(e) => setAssigningPackages((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                className="flex-1 text-[10px] bg-white border-2 border-lime/30 focus:border-lime/50 rounded-lg px-3 py-2 text-olive focus:outline-none transition-colors"
                              >
                                <option value="">— Sélectionner un package —</option>
                                {packages.map((pkg) => (
                                  <option key={pkg.id} value={pkg.id}>
                                    {pkg.name} ({pkg.scriptType.toUpperCase()})
                                  </option>
                                ))}
                              </select>
                            </div>
                            {selectedPackageId && selectedPackageId !== s.packageId && (
                              <button
                                onClick={() => handleAssignPackage(s.id, selectedPackageId)}
                                className="text-[10px] font-display tracking-widest bg-lime hover:bg-lime-dark text-olive rounded-lg px-4 py-2 transition-all shadow-md hover:shadow-lg"
                              >
                                ✓ ASSIGNER
                              </button>
                            )}
                            {s.packageId && (
                              <button
                                onClick={() => handleAssignPackage(s.id, "")}
                                className="text-[9px] font-display tracking-widest border border-olive/15 hover:border-red-300 text-olive-muted hover:text-red-500 rounded-lg px-2.5 py-1.5 transition-all"
                                title="Retirer du package"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SCRIPTS VALIDÉS TAB ──────────────────────────────────── */}
        {tab === "scripts_valides" && (
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl text-olive tracking-wider">
                SCRIPTS VALIDÉS ({scripts.filter((s) => ["validated", "in_production", "filmed"].includes(s.status)).length})
              </h2>
              <Link
                href={`/?companyId=${id}`}
                className="flex items-center gap-2 bg-lime/15 hover:bg-lime/25 border-2 border-lime/30 text-olive font-display tracking-widest text-sm rounded-xl px-4 py-2.5 transition-all"
              >
                ✦ GÉNÉRER POUR CE CLIENT
              </Link>
            </div>

            {scripts.filter((s) => ["validated", "in_production", "filmed"].includes(s.status)).length === 0 ? (
              <EmptyState
                icon="⭐"
                title="AUCUN SCRIPT VALIDÉ"
                description="Validez des scripts pour les voir apparaître ici"
              />
            ) : (
              <div className="space-y-2">
                {scripts
                  .filter((s) => ["validated", "in_production", "filmed"].includes(s.status))
                  .map((s) => {
                    const selectedPackageId = assigningPackages[s.id] ?? s.packageId ?? "";
                    
                    return (
                      <div key={s.id} className="bg-white border-2 border-lime/20 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-base">{ANGLE_LABELS[s.angle]?.emoji}</span>
                            <div>
                              <div className="text-[9px] font-display tracking-widest text-olive-muted">
                                {ANGLE_LABELS[s.angle]?.label}
                              </div>
                              {s.packageName && (
                                <div className="text-[9px] text-lime-dark font-semibold">📦 {s.packageName}</div>
                              )}
                            </div>
                          </div>

                          <p className="flex-1 text-xs text-olive-muted line-clamp-2 leading-relaxed">
                            {stripMarkdown(s.content).slice(0, 150) || "—"}
                          </p>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[9px] font-display tracking-widest px-2 py-1 rounded-lg border ${(SCRIPT_STATUS_CONFIG[s.status] ?? SCRIPT_STATUS_CONFIG.generated).color}`}>
                              {(SCRIPT_STATUS_CONFIG[s.status] ?? SCRIPT_STATUS_CONFIG.generated).label}
                            </span>
                            <select
                              value={s.status}
                              onChange={(e) => handleScriptStatus(s.id, e.target.value)}
                              className="text-[10px] bg-cream-input border border-olive/15 rounded-lg px-2 py-1 text-olive-muted focus:outline-none focus:border-olive"
                            >
                              <option value="generated">Généré</option>
                              <option value="validated">Validé</option>
                              <option value="in_production">En production</option>
                              <option value="filmed">Filmé</option>
                            </select>
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="text-[9px] font-display tracking-widest border border-olive/15 hover:border-olive/30 text-olive-muted hover:text-olive rounded-lg px-2.5 py-1.5 transition-all"
                            >
                              ✏ ÉDITER
                            </button>
                            <button
                              onClick={() => handleOpenShare(s)}
                              className="text-[9px] font-display tracking-widest border border-olive/15 hover:border-lime/40 text-olive-muted hover:text-olive rounded-lg px-2.5 py-1.5 transition-all"
                              title="Partager avec le client"
                            >
                              🔗 PARTAGER
                            </button>
                          </div>
                        </div>

                        {/* Package assignment section - Enhanced */}
                        {packages.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-lime/10 bg-gradient-to-r from-lime/5 to-transparent rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg shrink-0">📦</span>
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-[9px] text-olive-muted font-display tracking-widest shrink-0">
                                  {s.packageId ? "PACKAGE:" : "AJOUTER AU PACKAGE:"}
                                </span>
                                <select
                                  value={selectedPackageId}
                                  onChange={(e) => setAssigningPackages((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                  className="flex-1 text-[10px] bg-white border-2 border-lime/30 focus:border-lime/50 rounded-lg px-3 py-2 text-olive focus:outline-none transition-colors"
                                >
                                  <option value="">— Sélectionner un package —</option>
                                  {packages.map((pkg) => (
                                    <option key={pkg.id} value={pkg.id}>
                                      {pkg.name} ({pkg.scriptType.toUpperCase()})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {selectedPackageId && selectedPackageId !== s.packageId && (
                                <button
                                  onClick={() => handleAssignPackage(s.id, selectedPackageId)}
                                  className="text-[10px] font-display tracking-widest bg-lime hover:bg-lime-dark text-olive rounded-lg px-4 py-2 transition-all shadow-md hover:shadow-lg"
                                >
                                  ✓ ASSIGNER
                                </button>
                              )}
                              {s.packageId && (
                                <button
                                  onClick={() => handleAssignPackage(s.id, "")}
                                  className="text-[9px] font-display tracking-widest border border-olive/15 hover:border-red-300 text-olive-muted hover:text-red-500 rounded-lg px-2.5 py-1.5 transition-all"
                                  title="Retirer du package"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            {/* Package share shortcut */}
                            {s.packageId && (
                              <div className="mt-2 flex items-center gap-2">
                                <PackageShareButton packageId={s.packageId} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── MODÈLES TAB ──────────────────────────────────────────── */}
        {tab === "modeles" && (
          <ModelsTab
            companyId={id}
            referenceScripts={referenceScripts}
            onAdd={(s) => setReferenceScripts((prev) => [s, ...prev])}
            onDelete={(sid) => setReferenceScripts((prev) => prev.filter((s) => s.id !== sid))}
          />
        )}
      </div>

      {editingScript && (
        <ScriptEditModal
          script={editingScript}
          content={editContent}
          onContentChange={setEditContent}
          onSave={handleSaveEdit}
          saving={editSaving}
          aiInstruction={editAiInstruction}
          onAiInstructionChange={setEditAiInstruction}
          onAiEdit={handleAiEdit}
          aiLoading={editAiLoading}
          onClose={() => setEditingScript(null)}
        />
      )}

      {shareScript && (
        <ShareModal
          script={shareScript}
          tokens={shareTokens}
          loading={shareLoading}
          creating={shareCreating}
          copied={shareCopied}
          onCreate={handleCreateShare}
          onRevoke={handleRevokeShare}
          onCopy={handleCopyLink}
          onClose={() => setShareScript(null)}
        />
      )}

      {showCreatePackage && (
        <CreatePackageModal
          companyId={id}
          onClose={() => setShowCreatePackage(false)}
          onCreate={(pkg) => {
            setPackages((prev) => [pkg, ...prev]);
            setShowCreatePackage(false);
          }}
        />
      )}
    </div>
  );
}

/* ─── Create Package Modal ──────────────────────────────────── */

function CreatePackageModal({
  companyId,
  onClose,
  onCreate,
}: {
  companyId: string;
  onClose: () => void;
  onCreate: (p: PackageRow) => void;
}) {
  const [name, setName] = useState("");
  const [scriptType, setScriptType] = useState<ScriptType>("ugc");
  const [scriptCount, setScriptCount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Le nom est requis."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, name, scriptType, scriptCount: parseInt(scriptCount) || 0 }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const d = await res.json();
      onCreate(d.package);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-olive/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-cream-card border-2 border-olive/15 rounded-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-olive/10 flex items-center justify-between">
          <h2 className="font-display text-xl text-olive tracking-wider">NOUVEAU PACKAGE</h2>
          <button onClick={onClose} className="text-olive-muted hover:text-olive">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field label="Nom du package">
            <Input value={name} onChange={setName} placeholder="Ex: Pack Juin 2025 — 8 scripts UGC" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type de script">
              <select
                value={scriptType}
                onChange={(e) => setScriptType(e.target.value as ScriptType)}
                className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3 py-2.5 text-olive text-sm focus:border-olive transition-colors"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Nbre de scripts">
              <Input value={scriptCount} onChange={setScriptCount} placeholder="5" />
            </Field>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-olive/15 text-olive-muted text-sm font-display tracking-widest">ANNULER</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 rounded-xl bg-olive text-white text-sm font-display tracking-widest disabled:opacity-50">
            {loading ? "CRÉATION…" : "CRÉER"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Package Share Button ───────────────────────────────────── */

function PackageShareButton({ packageId }: { packageId: string }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/packages/${packageId}/share`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const link = `${window.location.origin}/share/package/${data.shareToken}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Erreur lors de la génération du lien");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className={`flex items-center gap-1.5 text-[9px] font-display tracking-widest px-3 py-1.5 rounded-lg border-2 transition-all disabled:opacity-50 ${
        copied
          ? "bg-lime/30 border-lime/50 text-olive"
          : "bg-lime/10 border-lime/30 hover:bg-lime/20 text-olive"
      }`}
    >
      {loading ? "…" : copied ? "✓ LIEN COPIÉ !" : "🔗 COPIER LIEN DU PACKAGE"}
    </button>
  );
}

/* ─── UI helpers ─────────────────────────────────────────────── */

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className={`font-display text-base tracking-wider ${accent ? "text-lime-dark" : "text-olive"}`}>{value}</div>
      <div className="text-olive-light text-[9px] uppercase tracking-widest">{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-olive tracking-wider text-base border-b border-olive/10 pb-3">
      {children}
    </h3>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-olive text-[10px] font-semibold uppercase tracking-[0.2em] mb-1.5">
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3.5 py-2.5 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3.5 py-2.5 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors resize-none"
    />
  );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-olive/8 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl opacity-30">{icon}</span>
      </div>
      <h3 className="font-display text-xl text-olive tracking-wider mb-2">{title}</h3>
      <p className="text-olive-muted text-sm max-w-xs">{description}</p>
    </div>
  );
}

/* ─── Models Tab Component ───────────────────────────────────── */

function ModelsTab({
  companyId,
  referenceScripts,
  onAdd,
  onDelete,
}: {
  companyId: string;
  referenceScripts: ReferenceScriptRow[];
  onAdd: (s: ReferenceScriptRow) => void;
  onDelete: (id: string) => void;
}) {
  const [mode, setMode] = useState<"text" | "file">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scriptType, setScriptType] = useState<ScriptType | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmitText = async () => {
    if (!content.trim()) { setError("Le contenu du script est requis."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/companies/${companyId}/reference-scripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, scriptType: scriptType || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const d = await res.json();
      onAdd(d.script);
      setTitle(""); setContent(""); setScriptType("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setLoading(false); }
  };

  const handleSubmitFile = async (file: File) => {
    setLoading(true); setError("");
    try {
      if (file.type === "application/pdf") {
        setError("Pour les PDF, veuillez copier-coller le texte dans l&apos;onglet Texte.");
        setLoading(false); return;
      }
      const form = new FormData();
      form.append("file", file);
      form.append("title", title || file.name.replace(/\.[^.]+$/, ""));
      if (scriptType) form.append("scriptType", scriptType);
      const res = await fetch(`/api/companies/${companyId}/reference-scripts`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const d = await res.json();
      onAdd(d.script);
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-olive tracking-wider">MODÈLES DE SCRIPTS</h2>
          <p className="text-olive-muted text-xs mt-1">
            Ajoute des scripts de référence — l&apos;IA s&apos;en inspirera pour générer dans le même style.
          </p>
        </div>
      </div>

      {/* Add form */}
      <div className="bg-white border-2 border-olive/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-lime inline-block" />
          <span className="text-[10px] font-display tracking-widest text-olive uppercase">Ajouter un modèle</span>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1.5">
          {(["text", "file"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg border-2 text-[10px] font-display tracking-widest transition-all ${
                mode === m ? "bg-olive border-olive text-lime" : "bg-cream-input border-olive/15 text-olive-muted hover:border-olive/30"
              }`}
            >
              {m === "text" ? "✏ COPIER-COLLER" : "📎 FICHIER .TXT"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Titre du modèle">
            <Input value={title} onChange={setTitle} placeholder="Ex: Script UGC validé juin 2025" />
          </Field>
          <Field label="Type de script">
            <select
              value={scriptType}
              onChange={(e) => setScriptType(e.target.value as ScriptType | "")}
              className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3.5 py-2.5 text-olive text-sm focus:border-olive transition-colors"
            >
              <option value="">— Automatique —</option>
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {mode === "text" ? (
          <>
            <Field label="Contenu du script">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Colle ici ton script de référence (UGC, micro-trottoir, face cam…)"
                rows={8}
                className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3.5 py-2.5 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors resize-none font-mono text-xs"
              />
            </Field>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              onClick={handleSubmitText}
              disabled={loading || !content.trim()}
              className="w-full bg-olive hover:bg-olive-dark disabled:opacity-40 text-white font-display tracking-widest text-sm rounded-xl py-3 transition-all"
            >
              {loading ? "AJOUT EN COURS…" : "✓ AJOUTER CE MODÈLE"}
            </button>
          </>
        ) : (
          <>
            <div
              className="border-2 border-dashed border-olive/20 rounded-xl p-8 text-center cursor-pointer hover:border-olive/40 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-2xl mb-2 opacity-30">📎</div>
              <p className="text-olive-muted text-sm">Clique pour choisir un fichier <strong>.txt</strong></p>
              <p className="text-olive-light text-[10px] mt-1">Pour les PDF, utilise l&apos;onglet Copier-Coller</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSubmitFile(file);
              }}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </>
        )}
      </div>

      {/* List */}
      {referenceScripts.length === 0 ? (
        <EmptyState
          icon="◎"
          title="AUCUN MODÈLE"
          description="Ajoute des scripts de référence pour que l'IA génère dans le même style"
        />
      ) : (
        <div className="space-y-3">
          {referenceScripts.map((s) => (
            <div key={s.id} className="bg-white border-2 border-olive/10 rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-sm opacity-40">{s.sourceType === "file" ? "📎" : "✏"}</span>
                  <div className="min-w-0">
                    <div className="font-display text-olive tracking-wider text-sm truncate">{s.title}</div>
                    <div className="text-olive-light text-[9px] uppercase tracking-widest mt-0.5">
                      {s.scriptType ? s.scriptType.replace("_", " ") : "Tous types"} · {new Date(s.createdAt).toLocaleDateString("fr-FR")} · {s.content.length} caractères
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                    className="text-[9px] font-display tracking-widest px-2.5 py-1.5 border-2 border-olive/15 text-olive-muted hover:border-olive/30 rounded-lg transition-all"
                  >
                    {expanded === s.id ? "RÉDUIRE" : "VOIR"}
                  </button>
                  <button
                    onClick={async () => {
                      await fetch(`/api/companies/${companyId}/reference-scripts`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: s.id }),
                      });
                      onDelete(s.id);
                    }}
                    className="text-[9px] font-display tracking-widest px-2.5 py-1.5 border-2 border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 rounded-lg transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {expanded === s.id && (
                <div className="border-t border-olive/8 px-4 py-3 bg-cream-card">
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
  );
}

/* ─── Script Edit Modal ──────────────────────────────────────── */

function ScriptEditModal({
  script,
  content,
  onContentChange,
  onSave,
  saving,
  aiInstruction,
  onAiInstructionChange,
  onAiEdit,
  aiLoading,
  onClose,
}: {
  script: ScriptRow;
  content: string;
  onContentChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  aiInstruction: string;
  onAiInstructionChange: (v: string) => void;
  onAiEdit: () => void;
  aiLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-olive/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-cream-card border-2 border-olive/15 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-olive/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-display text-lg text-olive tracking-wider">ÉDITER LE SCRIPT</h2>
            <p className="text-olive-muted text-[10px] uppercase tracking-widest mt-0.5">
              {ANGLE_LABELS[script.angle]?.emoji} {ANGLE_LABELS[script.angle]?.label}
              {script.packageName && ` · ${script.packageName}`}
            </p>
          </div>
          <button onClick={onClose} className="text-olive-muted hover:text-olive text-xl transition-colors">✕</button>
        </div>

        {/* Textarea */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-olive mb-2">
            Contenu du script — éditable directement
          </label>
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={16}
            className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-4 py-3 text-olive text-sm focus:border-olive transition-colors resize-none font-mono leading-relaxed"
            placeholder="Contenu du script…"
          />
        </div>

        {/* AI Edit section */}
        <div className="px-6 pb-4 shrink-0">
          <div className="bg-cream border-2 border-olive/8 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-olive-muted mb-2">
              ✦ Modifier avec l&apos;IA
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInstruction}
                onChange={(e) => onAiInstructionChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAiEdit()}
                placeholder="ex: Rends le hook plus percutant, raccourcis la fin…"
                className="flex-1 bg-cream-input border-2 border-olive/15 rounded-lg px-3 py-2 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors"
              />
              <button
                onClick={onAiEdit}
                disabled={aiLoading || !aiInstruction.trim()}
                className="bg-olive hover:bg-olive-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-display tracking-widest rounded-lg px-4 py-2 text-sm transition-all min-w-[110px] flex items-center justify-center gap-2"
              >
                {aiLoading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {aiLoading ? "IA…" : "APPLIQUER"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3 shrink-0 border-t border-olive/10 pt-4">
          <button
            onClick={onClose}
            className="flex-1 bg-cream-input border-2 border-olive/15 text-olive-muted hover:text-olive rounded-xl py-3 text-sm font-display tracking-widest transition-all"
          >
            ANNULER
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-olive hover:bg-olive-dark disabled:opacity-40 text-white font-display tracking-widest rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2"
          >
            {saving ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {saving ? "SAUVEGARDE…" : "💾 SAUVEGARDER"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Share Modal ─────────────────────────────────────────────── */

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "text-orange-500" },
  approved: { label: "✓ Approuvé", color: "text-lime-dark" },
  changes_requested: { label: "✏ Modifications demandées", color: "text-olive-muted" },
};

function ShareModal({
  script,
  tokens,
  loading,
  creating,
  copied,
  onCreate,
  onRevoke,
  onCopy,
  onClose,
}: {
  script: ScriptRow;
  tokens: ShareTokenRow[];
  loading: boolean;
  creating: boolean;
  copied: string | null;
  onCreate: () => void;
  onRevoke: (token: string) => void;
  onCopy: (url: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-olive/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-cream-card border-2 border-olive/15 rounded-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-olive/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-display text-lg text-olive tracking-wider">PARTAGER AVEC LE CLIENT</h2>
            <p className="text-olive-muted text-[10px] uppercase tracking-widest mt-0.5">
              {ANGLE_LABELS[script.angle]?.emoji} {ANGLE_LABELS[script.angle]?.label}
            </p>
          </div>
          <button onClick={onClose} className="text-olive-muted hover:text-olive text-xl transition-colors">✕</button>
        </div>

        <div className="px-6 py-5 flex-1 overflow-y-auto space-y-5">
          {/* Info banner */}
          <div className="bg-lime/10 border border-lime/25 rounded-xl px-4 py-3 text-sm text-olive-muted leading-relaxed">
            Génère un lien unique à envoyer au client. Il pourra <strong className="text-olive">modifier le script</strong>, 
            laisser un <strong className="text-olive">commentaire</strong> et <strong className="text-olive">approuver ou demander des changements</strong>.
            Aucune mention de l&apos;IA.
          </div>

          {/* Create new link */}
          <button
            onClick={onCreate}
            disabled={creating}
            className="w-full bg-olive hover:bg-olive-dark disabled:opacity-40 text-white font-display tracking-widest rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2"
          >
            {creating ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "🔗"}
            {creating ? "GÉNÉRATION DU LIEN…" : "GÉNÉRER UN NOUVEAU LIEN"}
          </button>

          {/* Token list */}
          <div>
            <div className="text-[10px] font-display tracking-widest text-olive-muted uppercase mb-2">
              Liens existants ({tokens.length})
            </div>

            {loading ? (
              <div className="text-center py-6 text-olive-muted text-sm">Chargement…</div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-6 text-olive-light text-sm">Aucun lien créé</div>
            ) : (
              <div className="space-y-2">
                {tokens.map((t) => {
                  const status = STATUS_LABELS[t.clientStatus] ?? STATUS_LABELS.pending;
                  return (
                    <div key={t.token} className="bg-white border-2 border-olive/8 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={`text-[10px] font-display tracking-widest ${status.color}`}>
                            {status.label}
                          </div>
                          <div className="text-[10px] text-olive-light mt-0.5">
                            Créé le {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                            {t.clientName && ` · ${t.clientName}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onCopy(t.shareUrl)}
                            className={`text-[9px] font-display tracking-widest px-2.5 py-1.5 rounded-lg border transition-all ${
                              copied === t.shareUrl
                                ? "bg-lime/20 border-lime/40 text-olive"
                                : "border-olive/15 hover:border-olive/30 text-olive-muted hover:text-olive"
                            }`}
                          >
                            {copied === t.shareUrl ? "✓ COPIÉ" : "📋 COPIER"}
                          </button>
                          <button
                            onClick={() => onRevoke(t.token)}
                            className="text-[9px] font-display tracking-widest border border-red-200 hover:border-red-300 text-red-400 hover:text-red-600 rounded-lg px-2.5 py-1.5 transition-all"
                          >
                            RÉVOQUER
                          </button>
                        </div>
                      </div>

                      {/* Client feedback */}
                      {t.clientStatus !== "pending" && (
                        <div className="border-t border-olive/6 pt-2 space-y-1">
                          {t.clientComment && (
                            <p className="text-xs text-olive-muted italic">
                              &ldquo;{t.clientComment}&rdquo;
                            </p>
                          )}
                          {t.clientContent && (
                            <div className="bg-lime/8 border border-lime/20 rounded-lg px-3 py-2">
                              <div className="text-[9px] text-olive-muted uppercase tracking-widest mb-1">Script modifié par le client</div>
                              <p className="text-[10px] text-olive line-clamp-3">{t.clientContent.slice(0, 200)}…</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-5 shrink-0 border-t border-olive/10 pt-4">
          <button
            onClick={onClose}
            className="w-full bg-cream-input border-2 border-olive/15 text-olive-muted hover:text-olive rounded-xl py-2.5 text-[10px] font-display tracking-widest transition-all"
          >
            FERMER
          </button>
        </div>
      </div>
    </div>
  );
}
