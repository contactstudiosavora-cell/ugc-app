import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ScriptType, Duration } from "@/lib/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, instruction, scriptType = "ugc", duration = "30-60" } = body as {
      script: string;
      instruction: string;
      scriptType?: ScriptType;
      duration?: Duration;
    };

    if (!script || !instruction) {
      return NextResponse.json(
        { error: "script et instruction sont requis." },
        { status: 400 }
      );
    }

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2_000,
      system: `Tu es un expert en copywriting UGC et scripts TikTok/Reels.
Tu vas modifier un script existant selon une instruction précise.
Garde le style oral et spontané du script original.
Conserve les indications de jeu entre parenthèses.
Adapte la longueur à la durée cible : ${duration} secondes.
Retourne UNIQUEMENT le script modifié — aucune explication, aucun markdown.`,
      messages: [
        {
          role: "user",
          content: `Script actuel (type: ${scriptType}, durée: ${duration}s) :

${script}

Instruction de modification : ${instruction}

Retourne uniquement le script modifié.`,
        },
      ],
    });

    const textBlock = msg.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Pas de contenu dans la réponse.");
    }

    return NextResponse.json({ script: textBlock.text.trim() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Edit API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
