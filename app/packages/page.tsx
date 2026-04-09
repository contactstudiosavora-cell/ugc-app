"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { PackageRow, PackageStatus, ScriptType } from "@/lib/types";

const STATUS_CONFIG: Record<PackageStatus, { label: string; color: string; dot: string }> = {
  active: { label: "ACTIF", color: "bg-lime/20 text-olive border-lime/30", dot: "bg-lime" },
  filming: { label: "EN TOURNAGE", color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-400" },
  completed: { label: "TERMINÉ", color: "bg-olive/10 text-olive-muted border-olive/20", dot: "bg-olive/40" },
};

const TYPE_LABELS: Record<ScriptType, string> = {
  ugc: "UGC",
  micro_trottoir: "MICRO-TROTTOIR",
  face_cam: "FACE CAM",
  auto: "AUTO",
};

type StatusFilter = "all" | PackageStatus;

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((d) => setPackages(d.packages ?? []))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (pkgId: string, status: PackageStatus) => {
    await fetch(`/api/packages/${pkgId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPackages((prev) =>
      prev.map((p) => (p.id === pkgId ? { ...p, status } : p))
    );
  };

  const filtered =
    filter === "all" ? packages : packages.filter((p) => p.status === filter);

  const counts = {
    all: packages.length,
    active: packages.filter((p) => p.status === "active").length,
    filming: packages.filter((p) => p.status === "filming").length,
    completed: packages.filter((p) => p.status === "completed").length,
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cream">
      {/* Header */}
      <div className="bg-cream-card border-b border-olive/10 px-8 py-6 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-lime inline-block" />
              <span className="text-olive-muted text-[10px] uppercase tracking-[0.2em] font-semibold">
                {packages.length} package{packages.length !== 1 ? "s" : ""}
              </span>
            </div>
            <h1 className="font-display text-3xl text-olive tracking-wider">PACKAGES</h1>
            <p className="text-olive-muted text-sm mt-1">Gère les packs de scripts par client</p>
          </div>
          <Link
            href="/companies"
            className="flex items-center gap-2 bg-olive hover:bg-olive-dark text-white font-display tracking-widest text-sm rounded-xl px-5 py-3 transition-all"
          >
            + CRÉER UN PACKAGE
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 mt-5">
          {(["all", "active", "filming", "completed"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-[10px] font-display tracking-widest transition-all ${
                filter === s
                  ? "bg-olive border-olive text-lime"
                  : "bg-cream-input border-olive/15 text-olive-muted hover:border-olive/30 hover:text-olive"
              }`}
            >
              {s !== "all" && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s as PackageStatus].dot}`}
                />
              )}
              {s === "all" ? "TOUS" : STATUS_CONFIG[s as PackageStatus].label}
              <span className="opacity-60">({counts[s]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-olive-muted text-sm uppercase tracking-widest">
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-olive/8 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl opacity-30">▦</span>
            </div>
            <h3 className="font-display text-xl text-olive tracking-wider mb-2">AUCUN PACKAGE</h3>
            <p className="text-olive-muted text-sm">Crée un package depuis la page d'une entreprise</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((pkg) => (
              <Link 
                key={pkg.id} 
                href={`/packages/${pkg.id}`}
                className="bg-white border-2 border-olive/10 hover:border-lime/40 rounded-2xl p-5 flex flex-col transition-all cursor-pointer hover:shadow-lg"
              >
                {/* Top */}
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-[9px] font-display tracking-widest px-2.5 py-1 rounded-full border ${STATUS_CONFIG[pkg.status].color}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_CONFIG[pkg.status].dot}`} />
                    {STATUS_CONFIG[pkg.status].label}
                  </span>
                  {pkg.companyName && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="text-[9px] text-olive-light hover:text-olive-muted transition-colors uppercase tracking-widest"
                    >
                      {pkg.companyName}
                    </div>
                  )}
                </div>

                <h3 className="font-display text-olive text-lg tracking-wider mb-1">{pkg.name}</h3>
                <p className="text-olive-muted text-xs mb-4">
                  {TYPE_LABELS[pkg.scriptType]} · Objectif : {pkg.scriptCount} scripts
                </p>

                {/* Progress */}
                <div className="mb-4 flex-1">
                  <div className="flex justify-between text-[9px] text-olive-light mb-1.5">
                    <span>{pkg.validatedCount ?? 0} validés</span>
                    <span>{pkg.filmedCount ?? 0}/{pkg.scriptCount} filmés</span>
                  </div>
                  <div className="h-2 bg-olive/8 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, pkg.scriptCount > 0 ? ((pkg.filmedCount ?? 0) / pkg.scriptCount) * 100 : 0)}%`,
                        backgroundColor: pkg.status === "completed" ? "#A3C210" : "#C9F019",
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-olive-light mt-1">
                    {pkg.totalScripts ?? 0} scripts générés au total
                  </div>
                </div>

                {/* Status change */}
                <div 
                  className="flex gap-1.5 pt-3 border-t border-olive/8"
                  onClick={(e) => e.preventDefault()}
                >
                  {(["active", "filming", "completed"] as PackageStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleStatusChange(pkg.id, s);
                      }}
                      className={`flex-1 text-[9px] font-display tracking-widest py-1.5 rounded-lg border transition-all ${
                        pkg.status === s
                          ? STATUS_CONFIG[s].color
                          : "border-olive/10 text-olive-light hover:border-olive/25 hover:text-olive-muted"
                      }`}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
