"use client";

import { useState, useEffect, useCallback } from "react";
import type { ScriptRow, CompanyRow, PackageRow, ScriptStatus } from "@/lib/types";
import ScriptRenderer from "@/components/ScriptRenderer";

const STATUS_CONFIG: Record<ScriptStatus, { label: string; next: ScriptStatus | null; nextLabel: string; color: string }> = {
  generated: { label: "GÉNÉRÉ", next: "validated", nextLabel: "✓ VALIDER", color: "bg-cream border-olive/15 text-olive-muted" },
  validated: { label: "VALIDÉ", next: "in_production", nextLabel: "▶ EN TOURNAGE", color: "bg-lime/20 border-lime/30 text-olive" },
  in_production: { label: "EN TOURNAGE", next: "filmed", nextLabel: "★ FILMÉ", color: "bg-orange-100 border-orange-200 text-orange-700" },
  filmed: { label: "FILMÉ ✓", next: null, nextLabel: "", color: "bg-olive/15 border-olive/20 text-olive" },
};

const ANGLE_LABELS = {
  emotional: { label: "ÉMOTIONNEL", emoji: "❤️" },
  problem_solution: { label: "PROBLÈME/SOL.", emoji: "🎯" },
  curiosity: { label: "CURIOSITÉ", emoji: "🔥" },
};

type StatusFilter = "all" | ScriptStatus;

export default function ProductionPage() {
  const [scripts, setScripts] = useState<ScriptRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("validated");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");

  // Selection for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Expanded script preview
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadScripts = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam =
        statusFilter === "all"
          ? "validated,in_production,filmed"
          : statusFilter;
      const url = new URL("/api/scripts", window.location.origin);
      url.searchParams.set("status", statusParam);
      if (companyFilter !== "all") url.searchParams.set("companyId", companyFilter);
      if (packageFilter !== "all") url.searchParams.set("packageId", packageFilter);

      const [scriptsRes, companiesRes, packagesRes] = await Promise.all([
        fetch(url.toString()).then((r) => r.json()),
        fetch("/api/companies").then((r) => r.json()),
        fetch("/api/packages").then((r) => r.json()),
      ]);
      setScripts(scriptsRes.scripts ?? []);
      setCompanies(companiesRes.companies ?? []);
      setPackages(packagesRes.packages ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, companyFilter, packageFilter]);

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  const handleStatusChange = async (scriptId: string, status: ScriptStatus) => {
    await fetch(`/api/scripts/${scriptId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setScripts((prev) =>
      prev.map((s) => (s.id === scriptId ? { ...s, status } : s))
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === scripts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(scripts.map((s) => s.id)));
    }
  };

  const handleBulkStatus = async (status: ScriptStatus) => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await fetch("/api/scripts/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptIds: Array.from(selected), status }),
      });
      setScripts((prev) =>
        prev.map((s) => (selected.has(s.id) ? { ...s, status } : s))
      );
      setSelected(new Set());
    } finally {
      setBulkLoading(false);
    }
  };

  const expandedScript = scripts.find((s) => s.id === expanded);

  const counts = {
    all: scripts.length,
    validated: scripts.filter((s) => s.status === "validated").length,
    in_production: scripts.filter((s) => s.status === "in_production").length,
    filmed: scripts.filter((s) => s.status === "filmed").length,
  };

  // Group scripts by company for display
  const grouped = scripts.reduce((acc, s) => {
    const key = s.companyName ?? s.companyId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, ScriptRow[]>);

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {/* ── LEFT: Script list ───────────────────────────────── */}
      <div className={`${expandedScript ? "w-[480px]" : "flex-1"} flex flex-col overflow-hidden shrink-0 transition-all`}>
        {/* Header */}
        <div className="bg-cream-card border-b border-olive/10 px-6 py-5 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-lime inline-block" />
                <span className="text-olive-muted text-[10px] uppercase tracking-[0.2em] font-semibold">
                  {scripts.length} script{scripts.length !== 1 ? "s" : ""}
                </span>
              </div>
              <h1 className="font-display text-2xl text-olive tracking-wider">PRODUCTION</h1>
            </div>
            <button
              onClick={loadScripts}
              className="text-olive-muted hover:text-olive text-xs font-display tracking-widest border border-olive/15 rounded-lg px-3 py-1.5 transition-all"
            >
              ↺ ACTUALISER
            </button>
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {(["all", "validated", "in_production", "filmed"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setSelected(new Set()); }}
                className={`px-3 py-1.5 rounded-lg border-2 text-[10px] font-display tracking-widest transition-all ${
                  statusFilter === s
                    ? "bg-olive border-olive text-lime"
                    : "bg-cream-input border-olive/15 text-olive-muted hover:border-olive/30"
                }`}
              >
                {s === "all" ? "TOUS" : STATUS_CONFIG[s].label}
                {s !== "all" && (
                  <span className="ml-1 opacity-60">({counts[s as keyof typeof counts] ?? 0})</span>
                )}
              </button>
            ))}
          </div>

          {/* Company + Package filters */}
          <div className="flex gap-2">
            <select
              value={companyFilter}
              onChange={(e) => { setCompanyFilter(e.target.value); setPackageFilter("all"); }}
              className="flex-1 bg-cream-input border-2 border-olive/15 rounded-xl px-3 py-2 text-olive text-xs focus:border-olive transition-colors"
            >
              <option value="all">Toutes les entreprises</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name ?? c.domain}</option>
              ))}
            </select>
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="flex-1 bg-cream-input border-2 border-olive/15 rounded-xl px-3 py-2 text-olive text-xs focus:border-olive transition-colors"
            >
              <option value="all">Tous les packages</option>
              {packages
                .filter((p) => companyFilter === "all" || p.companyId === companyFilter)
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
          </div>
        </div>

        {/* Scripts list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-olive-muted text-sm uppercase tracking-widest">
              Chargement…
            </div>
          ) : scripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-olive/8 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl opacity-30">▶</span>
              </div>
              <h3 className="font-display text-xl text-olive tracking-wider mb-2">AUCUN SCRIPT</h3>
              <p className="text-olive-muted text-sm">
                {statusFilter === "validated"
                  ? "Valide des scripts depuis la page Générer"
                  : "Aucun script pour ce filtre"}
              </p>
            </div>
          ) : (
            <>
              {/* Select all bar */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-olive/8 bg-cream-card">
                <input
                  type="checkbox"
                  checked={selected.size === scripts.length && scripts.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-olive/30 accent-olive"
                />
                <span className="text-[10px] text-olive-muted uppercase tracking-widest">
                  {selected.size > 0 ? `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}` : "Tout sélectionner"}
                </span>
              </div>

              {/* Grouped by company */}
              {Object.entries(grouped).map(([companyName, companyScripts]) => (
                <div key={companyName}>
                  <div className="px-4 py-2 bg-cream-card border-b border-olive/8 flex items-center gap-2">
                    <span className="font-display text-olive text-sm tracking-wider">{companyName}</span>
                    <span className="text-[9px] text-olive-light">{companyScripts.length} script{companyScripts.length > 1 ? "s" : ""}</span>
                  </div>
                  {companyScripts.map((s) => {
                    const cfg = STATUS_CONFIG[s.status];
                    const isSelected = selected.has(s.id);
                    const isExpanded = expanded === s.id;

                    return (
                      <div
                        key={s.id}
                        className={`flex items-start gap-3 px-4 py-3.5 border-b border-olive/6 transition-all cursor-pointer ${
                          isExpanded ? "bg-olive/5" : "hover:bg-cream-card"
                        } ${isSelected ? "bg-lime/8" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(s.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-olive/30 accent-olive mt-0.5 shrink-0"
                        />

                        <div
                          className="flex-1 min-w-0"
                          onClick={() => setExpanded(isExpanded ? null : s.id)}
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm">{ANGLE_LABELS[s.angle]?.emoji}</span>
                            <span className="text-[9px] font-display tracking-widest text-olive-muted">
                              {ANGLE_LABELS[s.angle]?.label}
                            </span>
                            {s.packageName && (
                              <span className="text-[9px] bg-olive/8 text-olive-muted px-2 py-0.5 rounded-full">
                                {s.packageName}
                              </span>
                            )}
                            <span className={`text-[9px] font-display tracking-widest px-2 py-0.5 rounded-lg border ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-olive-muted line-clamp-1 leading-relaxed">
                            {s.content.replace(/#+\s/g, "").replace(/\*/g, "").slice(0, 100)}
                          </p>
                        </div>

                        {/* Next status button */}
                        {cfg.next && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(s.id, cfg.next!);
                            }}
                            className="shrink-0 text-[9px] font-display tracking-widest px-2.5 py-1.5 rounded-lg bg-olive text-white hover:bg-olive-dark transition-all whitespace-nowrap"
                          >
                            {cfg.nextLabel}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="border-t-2 border-olive/15 bg-olive px-5 py-4 flex items-center justify-between animate-slide-up shrink-0">
            <span className="text-white/60 text-sm font-display tracking-widest">
              {selected.size} SCRIPT{selected.size > 1 ? "S" : ""} SÉLECTIONNÉ{selected.size > 1 ? "S" : ""}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkStatus("validated")}
                disabled={bulkLoading}
                className="bg-lime/20 border border-lime/40 text-white text-[10px] font-display tracking-widest rounded-lg px-3 py-2 hover:bg-lime/30 transition-all disabled:opacity-50"
              >
                ✓ VALIDER
              </button>
              <button
                onClick={() => handleBulkStatus("in_production")}
                disabled={bulkLoading}
                className="bg-orange-500/30 border border-orange-400/40 text-white text-[10px] font-display tracking-widest rounded-lg px-3 py-2 hover:bg-orange-500/40 transition-all disabled:opacity-50"
              >
                ▶ EN TOURNAGE
              </button>
              <button
                onClick={() => handleBulkStatus("filmed")}
                disabled={bulkLoading}
                className="bg-white/15 border border-white/20 text-white text-[10px] font-display tracking-widest rounded-lg px-3 py-2 hover:bg-white/20 transition-all disabled:opacity-50"
              >
                ★ FILMÉ
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-white/40 hover:text-white text-[10px] font-display tracking-widest px-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Script preview ──────────────────────────── */}
      {expandedScript && (
        <div className="flex-1 border-l-2 border-olive/10 overflow-y-auto">
          <div className="p-6 space-y-4 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{ANGLE_LABELS[expandedScript.angle]?.emoji}</span>
                  <span className="font-display text-olive tracking-wider text-lg">
                    {ANGLE_LABELS[expandedScript.angle]?.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {expandedScript.companyName && (
                    <span className="text-[10px] bg-olive/8 text-olive-muted px-2.5 py-1 rounded-full">
                      {expandedScript.companyName}
                    </span>
                  )}
                  {expandedScript.packageName && (
                    <span className="text-[10px] bg-lime/15 text-olive px-2.5 py-1 rounded-full">
                      {expandedScript.packageName}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setExpanded(null)}
                className="text-olive-muted hover:text-olive text-lg"
              >
                ✕
              </button>
            </div>

            {/* Status workflow */}
            <div className="flex gap-2">
              {(["generated", "validated", "in_production", "filmed"] as ScriptStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(expandedScript.id, s)}
                  className={`flex-1 py-2 rounded-xl border-2 text-[9px] font-display tracking-widest transition-all ${
                    expandedScript.status === s
                      ? STATUS_CONFIG[s].color
                      : "border-olive/10 text-olive-light hover:border-olive/25"
                  }`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>

            {/* Script content */}
            <div className="bg-white border-2 border-olive/10 rounded-2xl p-5">
              <ScriptRenderer content={expandedScript.content} />
            </div>

            {/* Notes */}
            <div>
              <div className="text-olive text-[10px] font-semibold uppercase tracking-[0.2em] mb-2">
                Notes de production
              </div>
              <textarea
                defaultValue={expandedScript.notes}
                placeholder="Notes internes (casting, accessoires, lieu…)"
                rows={3}
                onBlur={(e) => {
                  fetch(`/api/scripts/${expandedScript.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notes: e.target.value }),
                  });
                  setScripts((prev) =>
                    prev.map((s) =>
                      s.id === expandedScript.id ? { ...s, notes: e.target.value } : s
                    )
                  );
                }}
                className="w-full bg-cream-input border-2 border-olive/15 rounded-xl px-3.5 py-2.5 text-olive placeholder-olive-light text-sm focus:border-olive transition-colors resize-none"
              />
            </div>

            {/* Copy */}
            <button
              onClick={() => navigator.clipboard.writeText(expandedScript.content)}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-olive/15 hover:border-olive/30 text-olive-muted hover:text-olive rounded-xl py-2.5 text-[10px] font-display tracking-widest transition-all"
            >
              📋 COPIER LE SCRIPT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
