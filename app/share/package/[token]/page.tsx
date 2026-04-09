"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Script {
  id: string;
  angle: string;
  content: string;
  status: string;
  createdAt: string;
}

interface Feedback {
  id: string;
  scriptId: string;
  modifiedContent: string | null;
  comments: string | null;
  createdAt: string;
}

interface Package {
  id: string;
  name: string;
  scriptType: string;
  status: string;
  scriptCount: number;
  companyName: string | null;
  createdAt: string;
}

const ANGLE_LABELS: Record<string, { emoji: string; label: string }> = {
  emotional: { emoji: "❤️", label: "ÉMOTIONNEL" },
  problem_solution: { emoji: "🎯", label: "PROBLÈME/SOLUTION" },
  curiosity: { emoji: "🔥", label: "CURIOSITÉ" },
  storytelling: { emoji: "📖", label: "STORYTELLING" },
  social_proof: { emoji: "⭐", label: "PREUVE SOCIALE" },
  transformation: { emoji: "✨", label: "TRANSFORMATION" },
};

export default function SharePackagePage() {
  const params = useParams();
  const token = params.token as string;

  const [pkg, setPkg] = useState<Package | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [feedbacks, setFeedbacks] = useState<Record<string, Feedback>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Local state for edits
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    fetch(`/api/share/package/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Package introuvable");
        return r.json();
      })
      .then((data) => {
        setPkg(data.package);
        setScripts(data.scripts || []);
        
        // Initialize feedbacks map
        const feedbacksMap: Record<string, Feedback> = {};
        (data.feedbacks || []).forEach((f: Feedback) => {
          feedbacksMap[f.scriptId] = f;
        });
        setFeedbacks(feedbacksMap);

        // Initialize local state with existing data
        const contents: Record<string, string> = {};
        const cmts: Record<string, string> = {};
        (data.scripts || []).forEach((s: Script) => {
          const feedback = feedbacksMap[s.id];
          contents[s.id] = feedback?.modifiedContent || s.content;
          cmts[s.id] = feedback?.comments || "";
        });
        setEditedContents(contents);
        setComments(cmts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSaveScript = async (scriptId: string) => {
    setSaving((prev) => ({ ...prev, [scriptId]: true }));
    try {
      const res = await fetch(`/api/share/package/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId,
          modifiedContent: editedContents[scriptId],
          comments: comments[scriptId],
        }),
      });
      if (!res.ok) throw new Error();
      
      // Update local feedbacks
      setFeedbacks((prev) => ({
        ...prev,
        [scriptId]: {
          id: `fb_${scriptId}`,
          scriptId,
          modifiedContent: editedContents[scriptId],
          comments: comments[scriptId],
          createdAt: new Date().toISOString(),
        },
      }));
    } catch {
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving((prev) => ({ ...prev, [scriptId]: false }));
    }
  };

  const handleValidatePackage = async () => {
    if (!confirm("Êtes-vous sûr de vouloir valider ce package ? Cela notifiera l'équipe.")) {
      return;
    }

    setValidating(true);
    try {
      const res = await fetch(`/api/share/package/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      setValidated(true);
    } catch {
      alert("Erreur lors de la validation");
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <div className="text-olive-muted text-sm uppercase tracking-widest">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-cream">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="font-display text-2xl text-olive mb-2">LIEN INTROUVABLE</h1>
          <p className="text-olive-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (validated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-cream">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="font-display text-3xl text-olive mb-3">PACKAGE VALIDÉ !</h1>
          <p className="text-olive-muted text-sm">
            Merci pour votre validation. L'équipe a été notifiée et vous recontactera bientôt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-white border-b border-olive/10 px-6 md:px-12 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-lime inline-block" />
            <span className="text-olive-muted text-[10px] uppercase tracking-[0.2em] font-semibold">
              Révision Client
            </span>
          </div>
          <h1 className="font-display text-4xl text-olive tracking-wider mb-2">{pkg?.name || "Package"}</h1>
          {pkg?.companyName && (
            <p className="text-olive-muted text-sm">Pour : {pkg.companyName}</p>
          )}
          <p className="text-olive-muted text-xs mt-4">
            📝 Vous pouvez modifier les scripts, ajouter des commentaires, puis valider le package une fois satisfait.
          </p>
        </div>
      </div>

      {/* Scripts List */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {scripts.map((script, index) => {
            const angleInfo = ANGLE_LABELS[script.angle] || { emoji: "📝", label: script.angle };
            const isSaved = feedbacks[script.id];
            const hasChanges = editedContents[script.id] !== script.content || comments[script.id];

            return (
              <div key={script.id} className="bg-white border-2 border-olive/10 rounded-2xl overflow-hidden shadow-sm">
                {/* Script Header */}
                <div className="bg-gradient-to-r from-olive/5 to-transparent px-6 py-4 border-b border-olive/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{angleInfo.emoji}</span>
                    <div>
                      <div className="font-display text-olive tracking-wider">
                        Script #{index + 1} - {angleInfo.label}
                      </div>
                      <div className="text-[10px] text-olive-muted">
                        {new Date(script.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                  </div>
                  {isSaved && (
                    <div className="text-[9px] text-lime-dark font-display tracking-widest bg-lime/20 px-3 py-1.5 rounded-lg border border-lime/50">
                      ✓ SAUVEGARDÉ
                    </div>
                  )}
                </div>

                {/* Script Content - Editable */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] text-olive-muted uppercase tracking-widest font-semibold mb-2">
                      Contenu du script
                    </label>
                    <textarea
                      value={editedContents[script.id] || ""}
                      onChange={(e) => setEditedContents((prev) => ({ ...prev, [script.id]: e.target.value }))}
                      rows={12}
                      className="w-full bg-cream-input border-2 border-olive/15 focus:border-lime/50 rounded-xl px-4 py-3 text-olive-muted text-sm leading-relaxed focus:outline-none resize-none"
                      placeholder="Modifiez le script ici..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-olive-muted uppercase tracking-widest font-semibold mb-2">
                      Vos commentaires (optionnel)
                    </label>
                    <textarea
                      value={comments[script.id] || ""}
                      onChange={(e) => setComments((prev) => ({ ...prev, [script.id]: e.target.value }))}
                      rows={3}
                      className="w-full bg-cream-input border-2 border-olive/15 focus:border-lime/50 rounded-xl px-4 py-3 text-olive-muted text-sm leading-relaxed focus:outline-none resize-none"
                      placeholder="Ajoutez vos remarques, suggestions ou questions..."
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={() => handleSaveScript(script.id)}
                    disabled={saving[script.id] || !hasChanges}
                    className="bg-lime hover:bg-lime-dark disabled:opacity-40 disabled:cursor-not-allowed text-olive font-display tracking-widest text-sm rounded-xl px-6 py-3 transition-all shadow-md hover:shadow-lg disabled:shadow-none flex items-center gap-2"
                  >
                    {saving[script.id] ? (
                      <>
                        <span className="w-4 h-4 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
                        <span>SAUVEGARDE...</span>
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        <span>SAUVEGARDER CE SCRIPT</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Validate Package Button */}
          <div className="bg-gradient-to-r from-lime/10 to-olive/5 border-2 border-lime/30 rounded-2xl p-8 text-center">
            <h2 className="font-display text-2xl text-olive tracking-wider mb-3">
              VALIDER LE PACKAGE
            </h2>
            <p className="text-olive-muted text-sm mb-6 max-w-2xl mx-auto">
              Une fois que vous avez terminé vos modifications et commentaires, validez le package pour notifier l'équipe.
            </p>
            <button
              onClick={handleValidatePackage}
              disabled={validating}
              className="bg-olive hover:bg-olive-dark disabled:opacity-40 disabled:cursor-not-allowed text-lime font-display tracking-widest text-lg rounded-xl px-10 py-4 transition-all shadow-xl hover:shadow-2xl disabled:shadow-none inline-flex items-center gap-3"
            >
              {validating ? (
                <>
                  <span className="w-5 h-5 border-2 border-lime/30 border-t-lime rounded-full animate-spin" />
                  <span>VALIDATION EN COURS...</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">✓</span>
                  <span>VALIDER LE PACKAGE</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-olive/10 py-6 text-center text-olive-muted text-xs">
        <p>Merci de votre collaboration ! ✨</p>
      </div>
    </div>
  );
}
