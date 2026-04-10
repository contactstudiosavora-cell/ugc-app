"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ScriptContent from "@/components/ScriptContent";

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
  validated: boolean;
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
  // Which scripts are in edit mode
  const [editingScripts, setEditingScripts] = useState<Record<string, boolean>>({});

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
          validated: prev[scriptId]?.validated ?? false,
          createdAt: new Date().toISOString(),
        },
      }));
    } catch {
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving((prev) => ({ ...prev, [scriptId]: false }));
    }
  };

  const handleValidateScript = async (scriptId: string) => {
    const currentValidation = feedbacks[scriptId]?.validated ?? false;
    
    try {
      const res = await fetch(`/api/share/package/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId,
          modifiedContent: editedContents[scriptId],
          comments: comments[scriptId],
          validated: !currentValidation,
        }),
      });
      if (!res.ok) throw new Error();
      
      // Update local feedbacks
      setFeedbacks((prev) => ({
        ...prev,
        [scriptId]: {
          ...(prev[scriptId] || {
            id: `fb_${scriptId}`,
            scriptId,
            modifiedContent: editedContents[scriptId],
            comments: comments[scriptId],
            createdAt: new Date().toISOString(),
          }),
          validated: !currentValidation,
        },
      }));
    } catch {
      alert("Erreur lors de la validation");
    }
  };

  const handleValidatePackage = async () => {
    // Check if all scripts are validated
    const allValidated = scripts.every((s) => feedbacks[s.id]?.validated);
    
    if (!allValidated) {
      alert("Veuillez valider tous les scripts avant de valider le package complet.");
      return;
    }

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
      <div className="bg-white border-b border-olive/10 px-4 md:px-12 py-6 md:py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-lime inline-block" />
            <span className="text-olive-muted text-[10px] uppercase tracking-[0.2em] font-semibold">
              Révision Client
            </span>
          </div>
          <h1 className="font-display text-2xl md:text-4xl text-olive tracking-wider mb-2">{pkg?.name || "Package"}</h1>
          {pkg?.companyName && (
            <p className="text-olive-muted text-sm">Pour : {pkg.companyName}</p>
          )}
          <p className="text-olive-muted text-xs mt-4">
            📝 Vous pouvez modifier les scripts, ajouter des commentaires, puis valider le package une fois satisfait.
          </p>
        </div>
      </div>

      {/* Scripts List */}
      <div className="px-4 md:px-12 py-6 md:py-8">
        <div className="max-w-5xl mx-auto space-y-5 md:space-y-6">
          {scripts.map((script, index) => {
            const angleInfo = ANGLE_LABELS[script.angle] || { emoji: "📝", label: script.angle };
            const isSaved = feedbacks[script.id];
            const isValidated = feedbacks[script.id]?.validated ?? false;
            const hasChanges = editedContents[script.id] !== script.content || !!comments[script.id];

            return (
              <div key={script.id} className="bg-white border-2 border-olive/10 rounded-2xl overflow-hidden shadow-sm">
                {/* Script Header */}
                <div className="bg-gradient-to-r from-olive/5 to-transparent px-4 md:px-6 py-4 border-b border-olive/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <span className="text-xl md:text-2xl shrink-0">{angleInfo.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-display text-olive tracking-wider text-sm md:text-base truncate">
                        Script #{index + 1} — {angleInfo.label}
                      </div>
                      <div className="text-[10px] text-olive-muted">
                        {new Date(script.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaved && !isValidated && (
                      <div className="text-[9px] text-lime-dark font-display tracking-widest bg-lime/20 px-3 py-1.5 rounded-lg border border-lime/50">
                        💾 SAUVEGARDÉ
                      </div>
                    )}
                    {isValidated && (
                      <div className="text-[9px] text-olive font-display tracking-widest bg-lime/30 px-3 py-1.5 rounded-lg border-2 border-lime/60">
                        ✓ VALIDÉ
                      </div>
                    )}
                  </div>
                </div>

                {/* Script Content - View / Edit toggle */}
                <div className="p-4 md:p-6 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] text-olive-muted uppercase tracking-widest font-semibold">
                        Contenu du script
                      </label>
                      {!isValidated && (
                        <button
                          onClick={() => setEditingScripts((prev) => ({ ...prev, [script.id]: !prev[script.id] }))}
                          className={`text-[10px] font-display tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                            editingScripts[script.id]
                              ? "bg-[#2C2C1E] text-white border-[#2C2C1E]"
                              : "border-olive/20 text-olive-muted hover:text-olive hover:border-olive/40"
                          }`}
                        >
                          {editingScripts[script.id] ? "✕ FERMER L'ÉDITION" : "✏ MODIFIER"}
                        </button>
                      )}
                    </div>
                    {editingScripts[script.id] && !isValidated ? (
                      <textarea
                        value={editedContents[script.id] || ""}
                        onChange={(e) => setEditedContents((prev) => ({ ...prev, [script.id]: e.target.value }))}
                        rows={10}
                        className="w-full bg-cream-input border-2 border-olive/15 focus:border-lime/50 rounded-xl px-4 py-3 text-olive-muted text-sm leading-relaxed focus:outline-none resize-y min-h-[160px]"
                        placeholder="Modifiez le script ici..."
                        autoFocus
                      />
                    ) : (
                      <div className="bg-white rounded-xl border border-olive/10 px-5 py-4">
                        <ScriptContent content={editedContents[script.id] || ""} theme="admin" />
                        {editedContents[script.id] !== script.content && !editingScripts[script.id] && (
                          <p className="text-[10px] text-orange-500 mt-3 pt-2 border-t border-orange-100">
                            ✏ Version modifiée
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] text-olive-muted uppercase tracking-widest font-semibold mb-2">
                      Vos commentaires (optionnel)
                    </label>
                    <textarea
                      value={comments[script.id] || ""}
                      onChange={(e) => setComments((prev) => ({ ...prev, [script.id]: e.target.value }))}
                      disabled={isValidated}
                      rows={3}
                      className="w-full bg-cream-input border-2 border-olive/15 focus:border-lime/50 rounded-xl px-4 py-3 text-olive-muted text-sm leading-relaxed focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Ajoutez vos remarques, suggestions ou questions..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!isValidated && (
                      <>
                        <button
                          onClick={() => handleSaveScript(script.id)}
                          disabled={saving[script.id] || !hasChanges}
                          className="flex-1 bg-lime/15 hover:bg-lime/25 disabled:opacity-40 disabled:cursor-not-allowed border-2 border-lime/30 text-olive font-display tracking-widest text-sm rounded-xl px-6 py-3 transition-all flex items-center justify-center gap-2"
                        >
                          {saving[script.id] ? (
                            <>
                              <span className="w-4 h-4 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
                              <span>SAUVEGARDE...</span>
                            </>
                          ) : (
                            <>
                              <span>💾</span>
                              <span>SAUVEGARDER</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleValidateScript(script.id)}
                          disabled={hasChanges && !isSaved}
                          className="flex-1 bg-lime hover:bg-lime-dark disabled:opacity-40 disabled:cursor-not-allowed text-olive font-display tracking-widest text-sm rounded-xl px-6 py-3 transition-all shadow-md hover:shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
                        >
                          <span>✓</span>
                          <span>VALIDER CE SCRIPT</span>
                        </button>
                      </>
                    )}
                    {isValidated && (
                      <button
                        onClick={() => handleValidateScript(script.id)}
                        className="flex-1 bg-olive/10 hover:bg-olive/20 border-2 border-olive/30 text-olive font-display tracking-widest text-sm rounded-xl px-6 py-3 transition-all flex items-center justify-center gap-2"
                      >
                        <span>↻</span>
                        <span>ANNULER LA VALIDATION</span>
                      </button>
                    )}
                  </div>

                  {hasChanges && !isSaved && !isValidated && (
                    <p className="text-[10px] text-orange-600 text-center">
                      ⚠️ Sauvegardez vos modifications avant de valider ce script
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Validate Package Button */}
          <div className="bg-gradient-to-r from-lime/10 to-olive/5 border-2 border-lime/30 rounded-2xl p-5 md:p-8 text-center">
            <h2 className="font-display text-xl md:text-2xl text-olive tracking-wider mb-3">
              VALIDER LE PACKAGE COMPLET
            </h2>
            <p className="text-olive-muted text-sm mb-2 max-w-2xl mx-auto">
              {scripts.every((s) => feedbacks[s.id]?.validated)
                ? "✅ Tous les scripts sont validés ! Vous pouvez maintenant valider le package complet."
                : `📋 ${scripts.filter((s) => feedbacks[s.id]?.validated).length} / ${scripts.length} scripts validés. Validez tous les scripts pour pouvoir valider le package.`}
            </p>
            <button
              onClick={handleValidatePackage}
              disabled={validating || !scripts.every((s) => feedbacks[s.id]?.validated)}
              className="bg-olive hover:bg-olive-dark disabled:opacity-40 disabled:cursor-not-allowed text-lime font-display tracking-widest text-lg rounded-xl px-10 py-4 transition-all shadow-xl hover:shadow-2xl disabled:shadow-none inline-flex items-center gap-3 mt-4"
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
