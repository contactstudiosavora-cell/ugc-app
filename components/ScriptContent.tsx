"use client";

import React from "react";

/**
 * Renders script content (markdown-like) as clean, formatted prose.
 * Handles:
 *   ## Title        → bold section heading
 *   ### SubTitle    → small-caps label
 *   *(direction)*   → italic stage direction (muted)
 *   **bold**        → bold inline
 *   *italic*        → italic inline
 *   blank lines     → spacing
 *   regular text    → paragraph
 */

function formatInline(text: string): React.ReactNode {
  // Split on **bold** and *italic* patterns
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

interface ScriptContentProps {
  content: string;
  /** "admin" = olive theme, "client" = neutral theme (default) */
  theme?: "admin" | "client";
}

export default function ScriptContent({ content, theme = "client" }: ScriptContentProps) {
  if (!content?.trim()) {
    return (
      <p className={`text-sm italic ${theme === "admin" ? "text-olive-muted" : "text-[#2C2C1E]/35"}`}>
        Aucun contenu
      </p>
    );
  }

  const lines = content.split("\n");

  const titleClass =
    theme === "admin"
      ? "font-display text-olive tracking-wider text-base mt-5 mb-1 first:mt-0"
      : "font-semibold text-[#2C2C1E] text-base mt-6 mb-2 first:mt-0";

  const sectionClass =
    theme === "admin"
      ? "text-[10px] font-display tracking-[0.25em] text-olive-muted uppercase mt-4 mb-1"
      : "text-[10px] font-semibold tracking-[0.2em] text-[#2C2C1E]/45 uppercase mt-5 mb-1.5 border-b border-[#2C2C1E]/8 pb-1";

  const directionClass =
    theme === "admin"
      ? "text-xs text-olive-light italic my-1"
      : "text-xs text-[#2C2C1E]/38 italic my-1.5 pl-3 border-l-2 border-[#2C2C1E]/10";

  const paraClass =
    theme === "admin"
      ? "text-sm text-olive-muted leading-relaxed"
      : "text-sm text-[#2C2C1E]/80 leading-relaxed";

  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // ## Main title
    if (line.startsWith("## ")) {
      nodes.push(
        <p key={key++} className={titleClass}>
          {formatInline(line.slice(3))}
        </p>
      );
      continue;
    }

    // ### Section label
    if (line.startsWith("### ")) {
      nodes.push(
        <p key={key++} className={sectionClass}>
          {line.slice(4)}
        </p>
      );
      continue;
    }

    // *(stage direction)* — matches *(...)*
    if (/^\*\(.*\)\*$/.test(line)) {
      nodes.push(
        <p key={key++} className={directionClass}>
          {line.slice(2, -2)}
        </p>
      );
      continue;
    }

    // Blank line → small spacer
    if (line === "") {
      nodes.push(<div key={key++} className="h-1.5" />);
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={key++} className={paraClass}>
        {formatInline(line)}
      </p>
    );
  }

  return <div className="space-y-0.5">{nodes}</div>;
}

/** Strip all markdown for plain-text preview (line clamps, etc.) */
export function stripMarkdown(text: string): string {
  return (text ?? "")
    .replace(/^#{1,6}\s/gm, "")   // headings
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1")     // italic / stage directions
    .replace(/\*\(([^)]+)\)\*/g, "")   // *(direction)*
    .replace(/\n{2,}/g, " ")
    .trim();
}
