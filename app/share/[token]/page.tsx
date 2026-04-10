"use client";

import { useState, useEffect, use } from "react";
import ScriptContent from "@/components/ScriptContent";

interface ShareData {
  share: {
    token: string;
    clientName: string | null;
    clientStatus: "pending" | "approved" | "changes_requested";
    clientComment: string | null;
    clientContent: string | null;
    clientRespondedAt: string | null;
  };
  script: {
    id: string;
    content: string;
    angle: string;
    companyName: string | null;
    createdAt: string;
  };
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");
  const [clientName, setClientName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"approved" | "changes_requested" | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        setContent(d.script.content);
        if (d.share.clientName) setClientName(d.share.clientName);
        if (d.share.clientComment) setComment(d.share.clientComment);
        // If already responded, show submitted state
        if (d.share.clientStatus !== "pending") {
          setSubmitted(true);
          setSubmitStatus(d.share.clientStatus);
        }
      })
      .catch(() => setError("Impossible de charger le script."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (status: "approved" | "changes_requested") => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim() || null,
          clientContent: content !== data?.script.content ? content : null,
          clientComment: comment.trim() || null,
          clientStatus: status,
        }),
      });
      if (!res.ok) throw new Error();
      setSubmitStatus(status);
      setSubmitted(true);
    } catch {
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#2C2C1E]/20 border-t-[#2C2C1E] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#2C2C1E]/50 text-sm">Chargement du script…</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-[#2C2C1E]/10">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold text-[#2C2C1E] mb-2">Lien invalide</h1>
          <p className="text-[#2C2C1E]/50 text-sm">{error || "Ce lien est introuvable ou a expiré."}</p>
        </div>
      </div>
    );
  }

  const { share, script } = data;
  const hasChanges = content !== script.content;

  /* ── Already submitted ── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-sm border border-[#2C2C1E]/10 text-center">
          {submitStatus === "approved" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-[#C9F019]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h1 className="text-2xl font-semibold text-[#2C2C1E] mb-2">Script approuvé !</h1>
              <p className="text-[#2C2C1E]/50 text-sm">
                Merci pour votre validation. Nous allons procéder à la production.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✏️</span>
              </div>
              <h1 className="text-2xl font-semibold text-[#2C2C1E] mb-2">Modifications reçues</h1>
              <p className="text-[#2C2C1E]/50 text-sm">
                Vos modifications ont bien été transmises. Nous allons en tenir compte.
              </p>
            </>
          )}
          {share.clientComment && (
            <div className="mt-5 bg-[#F5F2EB] rounded-xl p-4 text-left">
              <p className="text-[10px] text-[#2C2C1E]/40 uppercase tracking-widest font-semibold mb-1">Votre commentaire</p>
              <p className="text-sm text-[#2C2C1E]/70 italic">&ldquo;{share.clientComment}&rdquo;</p>
            </div>
          )}
          <p className="text-xs text-[#2C2C1E]/30 mt-6">Vous pouvez fermer cette page.</p>
        </div>
      </div>
    );
  }

  /* ── Main review page ── */
  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      {/* Header */}
      <div className="bg-white border-b border-[#2C2C1E]/8 px-4 md:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-[#2C2C1E]/40 uppercase tracking-widest font-medium mb-0.5">
              Script à valider
            </div>
            <h1 className="font-semibold text-[#2C2C1E] text-base truncate">
              {script.companyName ?? "Script"}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            <span className="hidden sm:inline text-xs text-[#2C2C1E]/50 uppercase tracking-widest">En attente</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5 md:space-y-6">

        {/* Intro */}
        <div className="bg-white rounded-2xl p-6 border border-[#2C2C1E]/8 shadow-sm">
          <h2 className="font-semibold text-[#2C2C1E] text-lg mb-2">Votre script est prêt ✨</h2>
          <p className="text-[#2C2C1E]/55 text-sm leading-relaxed">
            Lisez le script ci-dessous. Vous pouvez le <strong className="text-[#2C2C1E]">modifier directement</strong> si vous souhaitez des changements,
            puis <strong className="text-[#2C2C1E]">ajouter un commentaire</strong> pour nous expliquer vos retours.
            <br />
            Quand vous êtes satisfait(e), cliquez sur <strong className="text-[#2C2C1E]">Approuver le script</strong>.
          </p>
        </div>

        {/* Script card */}
        <div className="bg-white rounded-2xl border border-[#2C2C1E]/8 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2C2C1E]/6 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#2C2C1E]/50 uppercase tracking-widest">Script</span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                isEditing
                  ? "bg-[#2C2C1E] text-white border-[#2C2C1E]"
                  : "border-[#2C2C1E]/15 text-[#2C2C1E]/50 hover:text-[#2C2C1E] hover:border-[#2C2C1E]/30"
              }`}
            >
              {isEditing ? "✕ Fermer l'édition" : "✏ Modifier le texte"}
            </button>
          </div>

          {isEditing ? (
            <div className="p-6">
              <p className="text-xs text-[#2C2C1E]/40 mb-2">Modifiez le texte directement ci-dessous :</p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={14}
                className="w-full bg-[#F5F2EB] border border-[#2C2C1E]/12 rounded-xl px-4 py-3 text-[#2C2C1E] text-sm leading-relaxed focus:outline-none focus:border-[#2C2C1E]/30 resize-y min-h-[200px]"
                autoFocus
              />
              {hasChanges && (
                <p className="text-xs text-orange-500 mt-2">
                  ✏ Vous avez modifié le script. Ces changements seront transmis avec votre retour.
                </p>
              )}
            </div>
          ) : (
            <div className="p-6">
              <ScriptContent content={content} theme="client" />
              {hasChanges && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <p className="text-xs text-orange-600">
                    ✏ Le texte a été modifié par rapport à la version originale.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Name + Comment */}
        <div className="bg-white rounded-2xl border border-[#2C2C1E]/8 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-[#2C2C1E] text-sm">Votre retour</h3>

          <div>
            <label className="block text-xs text-[#2C2C1E]/50 uppercase tracking-widest font-medium mb-1.5">
              Votre nom <span className="normal-case font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: Sophie Martin"
              className="w-full bg-[#F5F2EB] border border-[#2C2C1E]/12 rounded-xl px-4 py-2.5 text-[#2C2C1E] text-sm focus:outline-none focus:border-[#2C2C1E]/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-[#2C2C1E]/50 uppercase tracking-widest font-medium mb-1.5">
              Commentaire <span className="normal-case font-normal">(optionnel)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Vos remarques, suggestions ou questions…"
              rows={3}
              className="w-full bg-[#F5F2EB] border border-[#2C2C1E]/12 rounded-xl px-4 py-2.5 text-[#2C2C1E] text-sm focus:outline-none focus:border-[#2C2C1E]/30 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleSubmit("approved")}
            disabled={submitting}
            className="w-full bg-[#C9F019] hover:bg-[#b8dc16] disabled:opacity-50 disabled:cursor-not-allowed text-[#2C2C1E] font-semibold rounded-2xl py-4 text-base transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-[#2C2C1E]/20 border-t-[#2C2C1E] rounded-full animate-spin" />
            ) : "✓"}
            {submitting ? "Envoi en cours…" : "Approuver le script"}
          </button>

          <button
            onClick={() => handleSubmit("changes_requested")}
            disabled={submitting}
            className="w-full bg-white hover:bg-[#F5F2EB] disabled:opacity-50 disabled:cursor-not-allowed text-[#2C2C1E] font-medium rounded-2xl py-3.5 text-sm border-2 border-[#2C2C1E]/12 hover:border-[#2C2C1E]/20 transition-all flex items-center justify-center gap-2"
          >
            ✏ Demander des modifications
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#2C2C1E]/25 pb-4">
          Ce lien vous a été partagé par {script.companyName ?? "votre équipe"}.
        </p>
      </div>
    </div>
  );
}
