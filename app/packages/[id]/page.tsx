"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { PackageRow, ScriptRow, PackageStatus } from "@/lib/types";

const STATUS_CONFIG: Record<PackageStatus, { label: string; color: string }> = {
  active: { label: "ACTIF", color: "bg-lime/20 text-olive border-lime/30" },
  filming: { label: "EN TOURNAGE", color: "bg-orange-100 text-orange-700 border-orange-200" },
  completed: { label: "TERMINÉ", color: "bg-olive/10 text-olive-muted border-olive/20" },
};

const SCRIPT_STATUS_CONFIG = {
  generated: { label: "Généré", color: "bg-olive/10 text-olive-muted border-olive/15" },
  validated: { label: "Validé", color: "bg-lime/20 text-olive border-lime/30" },
  in_production: { label: "En production", color: "bg-orange-100 text-orange-700 border-orange-200" },
  filmed: { label: "Filmé", color: "bg-olive/30 text-olive border-olive/40" },
};

const ANGLE_LABELS: Record<string, { emoji: string; label: string }> = {
  emotional: { emoji: "❤️", label: "ÉMOTIONNEL" },
  problem_solution: { emoji: "🎯", label: "PROBLÈME/SOL." },
  curiosity: { emoji: "🔥", label: "CURIOSITÉ" },
  storytelling: { emoji: "📖", label: "STORYTELLING" },
  social_proof: { emoji: "⭐", label: "PREUVE SOCIALE" },
  transformation: { emoji: "✨", label: "TRANSFORMATION" },
};

export default function PackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [pkg, setPkg] = useState<PackageRow | null>(null);
  const [scripts, setScripts] = useState<ScriptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingScript, setViewingScript] = useState<ScriptRow | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const generateShareLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/packages/${id}/share`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const link = `${window.location.origin}/share/package/${data.shareToken}`;
      setShareLink(link);
      setShowShareModal(true);
    } catch {
      alert("Erreur lors de la génération du lien");
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      alert("Lien copié dans le presse-papiers !");
    }
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/packages/${id}`).then((r) => r.json()),
      fetch(`/api/scripts?packageId=${id}`).then((r) => r.json()),
    ])
      .then(([pkgData, scriptsData]) => {
        setPkg(pkgData.package ?? null);
        setScripts(scriptsData.scripts ?? []);
      })
      .catch(() => {
        setPkg(null);
        setScripts([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-cream">
        <div className="text-olive-muted text-sm uppercase tracking-widest">Chargement…</div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-cream">
        <div className="text-center">
          <h1 className="font-display text-2xl text-olive mb-2">PACKAGE INTROUVABLE</h1>
          <Link href="/packages" className="text-lime hover:text-lime-dark text-sm">
            ← Retour aux packages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cream">
      {/* Header */}
      <div className="bg-cream-card border-b border-olive/10 px-8 py-6 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/packages"
            className="text-olive-muted hover:text-olive transition-colors"
          >
            ← 
          </Link>
          <span className={`text-[9px] font-display tracking-widest px-2.5 py-1 rounded-full border ${STATUS_CONFIG[pkg.status].color}`}>
            {STATUS_CONFIG[pkg.status].label}
          </span>
        </div>

        <h1 className="font-display text-3xl text-olive tracking-wider mb-2">{pkg.name}</h1>
        
        <div className="flex items-center gap-6 text-sm text-olive-muted">
          {pkg.companyName && (
            <Link 
              href={`/companies/${pkg.companyId}`}
              className="hover:text-olive transition-colors"
            >
              📍 {pkg.companyName}
            </Link>
          )}
          <span>🎯 Objectif : {pkg.scriptCount} scripts</span>
          <span>✅ {scripts.filter((s) => s.status === "validated" || s.status === "in_production" || s.status === "filmed").length} validés</span>
          <span>🎬 {scripts.filter((s) => s.status === "filmed").length} filmés</span>
          <button
            onClick={generateShareLink}
            disabled={generatingLink}
            className="ml-auto flex items-center gap-2 bg-lime/15 hover:bg-lime/25 border-2 border-lime/30 text-olive font-display tracking-widest text-xs rounded-xl px-4 py-2 transition-all disabled:opacity-40"
          >
            {generatingLink ? "..." : "🔗 PARTAGER AVEC CLIENT"}
          </button>
        </div>
      </div>

      {/* Scripts List */}
      <div className="flex-1 overflow-y-auto p-8">
        <h2 className="font-display text-xl text-olive tracking-wider mb-5">
          SCRIPTS DU PACKAGE ({scripts.length})
        </h2>

        {scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-olive/8 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl opacity-30">📄</span>
            </div>
            <h3 className="font-display text-xl text-olive tracking-wider mb-2">AUCUN SCRIPT</h3>
            <p className="text-olive-muted text-sm">Aucun script n'a encore été assigné à ce package</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scripts.map((script) => (
              <div
                key={script.id}
                className="bg-white border-2 border-olive/10 hover:border-lime/30 rounded-xl p-4 transition-all cursor-pointer"
                onClick={() => setViewingScript(script)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-base">{ANGLE_LABELS[script.angle]?.emoji || "📝"}</span>
                    <div className="text-[9px] font-display tracking-widest text-olive-muted">
                      {ANGLE_LABELS[script.angle]?.label || script.angle}
                    </div>
                  </div>

                  <p className="flex-1 text-xs text-olive-muted line-clamp-2 leading-relaxed">
                    {(script.content ?? "").replace(/#+\s/g, "").replace(/\*/g, "").slice(0, 200) || "—"}
                  </p>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-display tracking-widest px-2 py-1 rounded-lg border ${SCRIPT_STATUS_CONFIG[script.status]?.color || SCRIPT_STATUS_CONFIG.generated.color}`}>
                      {SCRIPT_STATUS_CONFIG[script.status]?.label || "Généré"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingScript(script);
                      }}
                      className="text-[9px] font-display tracking-widest border border-olive/15 hover:border-olive/30 text-olive-muted hover:text-olive rounded-lg px-2.5 py-1.5 transition-all"
                    >
                      👁 VOIR
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Script Viewer Modal */}
      {viewingScript && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-8"
          onClick={() => setViewingScript(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-olive/5 px-6 py-4 border-b border-olive/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{ANGLE_LABELS[viewingScript.angle]?.emoji || "📝"}</span>
                <div>
                  <div className="font-display text-olive tracking-wider">
                    {ANGLE_LABELS[viewingScript.angle]?.label || viewingScript.angle}
                  </div>
                  <div className="text-[10px] text-olive-muted">
                    {new Date(viewingScript.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingScript(null)}
                className="text-olive-muted hover:text-olive text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-olive-muted leading-relaxed">
                  {viewingScript.content || "Aucun contenu"}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-olive/5 px-6 py-4 border-t border-olive/10 flex items-center justify-between">
              <span className={`text-[9px] font-display tracking-widest px-3 py-1.5 rounded-lg border ${SCRIPT_STATUS_CONFIG[viewingScript.status]?.color || SCRIPT_STATUS_CONFIG.generated.color}`}>
                {SCRIPT_STATUS_CONFIG[viewingScript.status]?.label || "Généré"}
              </span>
              <button
                onClick={() => setViewingScript(null)}
                className="text-[10px] font-display tracking-widest bg-olive hover:bg-olive-dark text-white rounded-lg px-4 py-2 transition-all"
              >
                FERMER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {showShareModal && shareLink && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-8"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-olive tracking-wider">
                🔗 LIEN DE PARTAGE
              </h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-olive-muted hover:text-olive text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-olive-muted text-sm mb-4">
              Partagez ce lien avec votre client pour qu'il puisse réviser les scripts, ajouter des commentaires et valider le package.
            </p>

            <div className="bg-cream-input border-2 border-olive/15 rounded-xl p-4 mb-6 break-all text-olive-muted text-sm font-mono">
              {shareLink}
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyShareLink}
                className="flex-1 bg-lime hover:bg-lime-dark text-olive font-display tracking-widest text-sm rounded-xl px-6 py-3 transition-all"
              >
                📋 COPIER LE LIEN
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 bg-olive/10 hover:bg-olive/20 text-olive font-display tracking-widest text-sm rounded-xl px-6 py-3 transition-all"
              >
                FERMER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
