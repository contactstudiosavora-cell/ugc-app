"use client";

import ScriptRenderer from "@/components/ScriptRenderer";

const ANGLE_LABELS: Record<string, { label: string; emoji: string }> = {
  emotional: { label: "ÉMOTIONNEL", emoji: "❤️" },
  problem_solution: { label: "PROBLÈME/SOLUTION", emoji: "🎯" },
  curiosity: { label: "CURIOSITÉ", emoji: "🔥" },
  storytelling: { label: "STORYTELLING", emoji: "📖" },
  social_proof: { label: "PREUVE SOCIALE", emoji: "⭐" },
  transformation: { label: "TRANSFORMATION", emoji: "✨" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  generated: { label: "GÉNÉRÉ", color: "bg-cream border-olive/15 text-olive-muted" },
  validated: { label: "VALIDÉ", color: "bg-lime/20 border-lime/30 text-olive" },
  in_production: { label: "EN PROD", color: "bg-orange-100 border-orange-200 text-orange-700" },
  filmed: { label: "FILMÉ", color: "bg-olive/15 border-olive/20 text-olive" },
};

export interface ScriptViewerScript {
  id: string;
  angle: string;
  content: string;
  status: string;
  createdAt: string;
  packageName?: string | null;
  companyName?: string | null;
}

interface ScriptViewerModalProps {
  script: ScriptViewerScript;
  onClose: () => void;
  /** Optional extra action buttons rendered in the footer */
  actions?: React.ReactNode;
}

export default function ScriptViewerModal({ script, onClose, actions }: ScriptViewerModalProps) {
  const angle = ANGLE_LABELS[script.angle] ?? { label: script.angle.toUpperCase(), emoji: "📝" };
  const status = STATUS_CONFIG[script.status] ?? STATUS_CONFIG.generated;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-8"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-olive/5 px-6 py-4 border-b border-olive/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{angle.emoji}</span>
            <div>
              <div className="font-display text-olive tracking-wider text-sm">
                {angle.label}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-olive-muted">
                  {new Date(script.createdAt).toLocaleDateString("fr-FR")}
                </span>
                {script.packageName && (
                  <span className="text-[10px] text-lime-dark font-semibold">· 📦 {script.packageName}</span>
                )}
                {script.companyName && (
                  <span className="text-[10px] text-olive-muted">· {script.companyName}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-olive-muted hover:text-olive text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-olive/8 transition-all"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <ScriptRenderer content={script.content || ""} />
        </div>

        {/* Footer */}
        <div className="bg-olive/5 px-6 py-4 border-t border-olive/10 flex items-center justify-between shrink-0">
          <span className={`text-[9px] font-display tracking-widest px-3 py-1.5 rounded-lg border ${status.color}`}>
            {status.label}
          </span>
          <div className="flex items-center gap-2">
            {actions}
            <button
              onClick={onClose}
              className="text-[10px] font-display tracking-widest bg-olive hover:bg-olive-dark text-white rounded-lg px-4 py-2 transition-all"
            >
              FERMER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
