"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { CompanyRow, ScriptType } from "@/lib/types";

const CONTENT_TYPE_LABELS: Record<ScriptType, string> = {
  ugc: "UGC",
  micro_trottoir: "MICRO-TROTTOIR",
  face_cam: "FACE CAM",
  auto: "AUTO",
};

/* ─── Create Company Modal ──────────────────────────────────── */

function CreateCompanyModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (c: CompanyRow) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    domain: "",
    niche: "",
    description: "",
    communicationStyle: "",
    targetAudience: "",
    servicesProducts: "",
    brandVoice: "",
    contentTypes: [] as ScriptType[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleType = (t: ScriptType) => {
    setForm((prev) => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(t)
        ? prev.contentTypes.filter((x) => x !== t)
        : [...prev.contentTypes, t],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Le nom est requis."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      const data = await res.json();
      onCreate(data.company);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-olive/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-cream-card border-2 border-olive/15 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-olive/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-olive tracking-wider">NOUVELLE ENTREPRISE</h2>
            <p className="text-olive-muted text-xs mt-1">Ces infos enrichissent la génération des scripts</p>
          </div>
          <button onClick={onClose} className="text-olive-muted hover:text-olive text-xl">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom de l'entreprise *</Label>
              <Input value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Ex: Studio Savora" />
            </div>
            <div>
              <Label>Domaine</Label>
              <Input value={form.domain} onChange={(v) => setForm((p) => ({ ...p, domain: v }))} placeholder="studiosavora.com" />
            </div>
          </div>

          <div>
            <Label>Niche / Secteur</Label>
            <Input value={form.niche} onChange={(v) => setForm((p) => ({ ...p, niche: v }))} placeholder="Ex: skincare, SaaS, fitness…" />
          </div>

          <div>
            <Label>Description de la marque</Label>
            <Textarea
              value={form.description}
              onChange={(v) => setForm((p) => ({ ...p, description: v }))}
              placeholder="Qui sont-ils ? Que font-ils ? Quelle est leur mission ?"
              rows={3}
            />
          </div>

          <div>
            <Label>Style de communication</Label>
            <Input
              value={form.communicationStyle}
              onChange={(v) => setForm((p) => ({ ...p, communicationStyle: v }))}
              placeholder="Ex: Casual et engagé, Expert et sérieux, Humour et proximité…"
            />
          </div>

          <div>
            <Label>Cible principale</Label>
            <Input
              value={form.targetAudience}
              onChange={(v) => setForm((p) => ({ ...p, targetAudience: v }))}
              placeholder="Ex: Femmes 25-45 ans actives, Hommes 18-35 ans gamers…"
            />
          </div>

          <div>
            <Label>Produits / Services</Label>
            <Textarea
              value={form.servicesProducts}
              onChange={(v) => setForm((p) => ({ ...p, servicesProducts: v }))}
              placeholder="Décris ce qu'ils vendent : produits phares, gamme, prix…"
              rows={2}
            />
          </div>

          <div>
            <Label>Personnalité de marque</Label>
            <Input
              value={form.brandVoice}
              onChange={(v) => setForm((p) => ({ ...p, brandVoice: v }))}
              placeholder="Ex: Bienveillante, ambitieuse, disruptive, authentique…"
            />
          </div>

          <div>
            <Label>Types de contenu</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {(Object.keys(CONTENT_TYPE_LABELS) as ScriptType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-[10px] font-display tracking-widest transition-all ${
                    form.contentTypes.includes(t)
                      ? "bg-olive border-olive text-lime"
                      : "bg-cream-input border-olive/15 text-olive-muted hover:border-olive/30"
                  }`}
                >
                  {CONTENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-olive/15 text-olive-muted hover:text-olive text-sm font-display tracking-widest transition-all"
          >
            ANNULER
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-olive hover:bg-olive-dark disabled:opacity-50 text-white text-sm font-display tracking-widest transition-all"
          >
            {loading ? "CRÉATION…" : "CRÉER"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? []))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-olive/10 bg-cream-card flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-lime inline-block" />
              <span className="text-olive-muted text-[10px] uppercase tracking-[0.2em] font-semibold">
                {companies.length} entreprise{companies.length !== 1 ? "s" : ""}
              </span>
            </div>
            <h1 className="font-display text-3xl text-olive tracking-wider">ENTREPRISES</h1>
            <p className="text-olive-muted text-sm mt-1">
              Gérez vos clients et enrichissez leur profil pour des scripts toujours plus précis
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-olive hover:bg-olive-dark text-white font-display tracking-widest text-sm rounded-xl px-5 py-3 transition-all"
          >
            <span>+</span> NOUVELLE ENTREPRISE
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-olive-muted text-sm uppercase tracking-widest">
              Chargement…
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-20 h-20 rounded-2xl bg-olive/8 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl opacity-30">◈</span>
              </div>
              <h3 className="font-display text-2xl text-olive tracking-wider mb-2">AUCUNE ENTREPRISE</h3>
              <p className="text-olive-muted text-sm mb-4 max-w-xs">
                Crée ta première entreprise cliente pour générer des scripts ultra-personnalisés
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-olive hover:bg-olive-dark text-white font-display tracking-widest text-sm rounded-xl px-5 py-3 transition-all"
              >
                + CRÉER UNE ENTREPRISE
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {companies.map((c) => (
                <Link key={c.id} href={`/companies/${c.id}`} className="group">
                  <div className="bg-white border-2 border-olive/10 hover:border-olive/30 rounded-2xl p-5 transition-all duration-200 h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-olive/8 flex items-center justify-center">
                        <span className="font-display text-olive text-lg leading-none">
                          {(c.name ?? c.domain).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-olive-light text-[9px] uppercase tracking-widest font-sans">
                        {new Date(c.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </span>
                    </div>

                    <h3 className="font-display text-olive text-xl tracking-wider mb-1 group-hover:text-olive-dark transition-colors">
                      {c.name ?? c.domain}
                    </h3>
                    <p className="text-olive-muted text-xs mb-1">{c.domain}</p>
                    {c.niche && (
                      <span className="inline-block bg-lime/15 text-olive text-[9px] font-sans uppercase tracking-widest rounded-full px-2.5 py-1 mb-3">
                        {c.niche}
                      </span>
                    )}

                    {c.description && (
                      <p className="text-olive-muted text-xs mb-3 line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex gap-4 pt-3 border-t border-olive/8">
                      <div className="text-center">
                        <div className="font-display text-olive text-base tracking-wider">{c.generationCount ?? 0}</div>
                        <div className="text-olive-light text-[9px] uppercase tracking-widest">Générations</div>
                      </div>
                      <div className="text-center">
                        <div className="font-display text-lime-dark text-base tracking-wider">{c.validatedCount ?? 0}</div>
                        <div className="text-olive-light text-[9px] uppercase tracking-widest">Validés</div>
                      </div>
                      <div className="text-center">
                        <div className="font-display text-olive text-base tracking-wider">{c.packageCount ?? 0}</div>
                        <div className="text-olive-light text-[9px] uppercase tracking-widest">Packages</div>
                      </div>
                    </div>

                    {/* Profile completeness */}
                    {!c.description && !c.communicationStyle && (
                      <div className="mt-3 flex items-center gap-2 text-olive-light text-[10px]">
                        <span>⚠</span>
                        <span>Profil incomplet — enrichis pour de meilleurs scripts</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateCompanyModal
          onClose={() => setShowCreate(false)}
          onCreate={(c) => {
            setCompanies((prev) => [c, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

/* ─── Shared sub-components ─────────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-olive text-[10px] font-semibold uppercase tracking-[0.2em] mb-1.5">
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
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

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
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
