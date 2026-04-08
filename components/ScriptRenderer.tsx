"use client";

/**
 * Renders script content with basic markdown support.
 *
 * All script types now produce structured markdown:
 * - UGC / Face cam / Auto  → ## + ### sections, "dialogue", *(stage directions)*
 * - Micro-trottoir          → same + **bold responses**, → arrows, ---, > blockquotes
 *
 * Styled for Studio Savora light cream theme.
 */

interface Props {
  content: string;
}

function hasMarkdownSections(text: string): boolean {
  return /^##\s/m.test(text) || /^###\s/m.test(text);
}

export default function ScriptRenderer({ content }: Props) {
  if (!hasMarkdownSections(content)) {
    // Fallback: plain monospace (shouldn't happen with new prompts, but safe)
    return (
      <div className="text-olive text-sm leading-[1.8] whitespace-pre-wrap font-mono bg-cream rounded-xl p-5 border border-olive/10">
        {content}
      </div>
    );
  }

  const lines = content.split("\n");

  return (
    <div className="bg-cream rounded-xl border border-olive/10 overflow-hidden text-sm">
      {lines.map((line, i) => {
        // ## H2 — script title
        if (/^##\s/.test(line)) {
          const text = line.replace(/^##\s/, "");
          return (
            <div key={i} className="px-5 pt-5 pb-3 border-b border-olive/8">
              <h2 className="font-display text-xl text-olive tracking-wider leading-none">
                {renderInline(text)}
              </h2>
            </div>
          );
        }

        // ### H3 — section label
        if (/^###\s/.test(line)) {
          const text = line.replace(/^###\s/, "");
          // Section names that are "structural" get a label pill style
          const isSectionLabel = /^(HOOK|CORPS|SOLUTION|PREUVE|RÉSULTAT|CTA|TWIST|RELANCE\s\d+)$/i.test(
            text.trim()
          );
          return (
            <div key={i} className="px-5 pt-4 pb-1">
              {isSectionLabel ? (
                <span className="inline-flex items-center gap-1.5 bg-olive text-lime text-[9px] font-display tracking-[0.2em] rounded-md px-2.5 py-1 leading-none">
                  ● {text}
                </span>
              ) : (
                <h3 className="text-olive-muted font-sans font-semibold text-[10px] uppercase tracking-[0.18em]">
                  {renderInline(text)}
                </h3>
              )}
            </div>
          );
        }

        // --- divider
        if (/^---+$/.test(line.trim())) {
          return <hr key={i} className="border-olive/10 mx-5 my-1" />;
        }

        // > blockquote (notes de tournage)
        if (/^>\s/.test(line)) {
          const text = line.replace(/^>\s/, "");
          return (
            <div key={i} className="mx-5 my-2 border-l-2 border-amber-400/60 bg-amber-50 pl-3 py-1.5 text-amber-700/80 text-xs rounded-r-lg">
              {renderInline(text)}
            </div>
          );
        }

        // → arrow (micro-trottoir response follow-up)
        if (/^→/.test(line)) {
          const text = line.replace(/^→\s*/, "");
          return (
            <div key={i} className="flex gap-2 pl-10 pr-5 my-0.5">
              <span className="text-olive-light font-bold shrink-0 mt-0.5 text-xs">→</span>
              <span className="text-olive-muted italic leading-relaxed">
                {renderInline(text)}
              </span>
            </div>
          );
        }

        // *(stage direction)* — lines like *(montrer)* or *(avant / après)*
        if (/^\*\(/.test(line) && line.trim().endsWith(")*")) {
          const text = line.replace(/^\*\(/, "").replace(/\)\*\s*$/, "");
          return (
            <div key={i} className="mx-5 my-2 flex items-start gap-2 bg-olive/[0.04] rounded-lg px-3 py-2 border border-olive/8">
              <span className="text-olive-light text-xs mt-px shrink-0">▶</span>
              <span className="text-olive-muted italic text-xs leading-relaxed">
                {text}
              </span>
            </div>
          );
        }

        // Empty line
        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }

        // **"Bold quoted response"** (micro-trottoir)
        if (/^\*\*"/.test(line) && /"\*\*$/.test(line)) {
          const text = line.replace(/^\*\*"/, "").replace(/"\*\*$/, "");
          return (
            <div key={i} className="px-5 py-1">
              <span className="inline-block bg-lime/25 border border-lime/40 text-olive font-semibold text-sm rounded-lg px-3 py-1">
                &ldquo;{text}&rdquo;
              </span>
            </div>
          );
        }

        // Default paragraph — the main script lines
        return (
          <p key={i} className="text-olive/85 leading-relaxed px-5 py-0.5">
            {renderInline(line)}
          </p>
        );
      })}
      {/* Bottom padding */}
      <div className="h-4" />
    </div>
  );
}

/** Render inline markdown: **bold**, "dialogue in quotes", *(stage direction inline)* */
function renderInline(text: string): React.ReactNode {
  // Split on **bold**, "quoted text", or *(inline stage direction)*
  const parts = text.split(/(\*\*[^*]+\*\*|"[^"]*"|\*\([^)]+\)\*)/g);

  return parts.map((part, i) => {
    // **bold**
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={i} className="text-olive font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // "dialogue in quotes"
    if (/^"[^"]*"$/.test(part)) {
      return (
        <span key={i} className="font-medium text-olive">
          {part}
        </span>
      );
    }
    // *(inline stage direction)*
    if (/^\*\([^)]+\)\*$/.test(part)) {
      const inner = part.slice(2, -2);
      return (
        <span key={i} className="text-olive-muted italic text-xs bg-olive/[0.04] rounded px-1">
          ({inner})
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
