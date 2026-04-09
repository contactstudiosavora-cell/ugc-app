import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCompanyById } from "@/lib/database";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée." }, { status: 404 });
    }

    const domain = company.domain ?? "";
    const name = company.name ?? domain;
    const niche = company.niche ?? "";

    const prompt = `Tu es un expert en marketing digital et branding.
Analyse cette marque et génère un profil marketing complet pour l'aider à créer des scripts UGC efficaces.

Marque : ${name}
Domaine : ${domain}
${niche ? `Niche connue : ${niche}` : ""}

Génère un profil marketing complet et réaliste basé sur ce que tu sais (ou peux déduire raisonnablement) de cette marque.
Si tu ne connais pas la marque, génère des suggestions cohérentes avec son nom/domaine/niche.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication :
{
  "niche": "secteur ou niche de la marque (skincare, SaaS B2B, mode streetwear...)",
  "description": "2-3 phrases décrivant la marque, ce qu'elle fait, sa mission",
  "communicationStyle": "style de comm en quelques mots (ex: Casual et engagé, Expert et rassurant...)",
  "targetAudience": "cible principale (ex: Femmes 25-40 ans, sportives, sensibles au naturel...)",
  "servicesProducts": "description des produits/services phares avec différenciants",
  "brandVoice": "personnalité de la marque en 3-4 adjectifs (ex: Authentique, bienveillante, ambitieuse...)"
}`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = msg.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Pas de réponse de l'IA.");
    }

    // Parse JSON — strip any accidental markdown fences
    const raw = textBlock.text.trim().replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
    const suggestions = JSON.parse(raw);

    return NextResponse.json({ suggestions });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
