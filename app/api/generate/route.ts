import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  extractDomain,
  upsertCompany,
  getCompanyById,
  buildLearningContext,
  insertGeneration,
  createScripts,
} from "@/lib/database";
import type { ScriptType, Duration, ScriptAngle } from "@/lib/types";
import { randomUUID } from "crypto";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Pricing for claude-haiku-4-5 — $/million tokens
const PRICING = { input: 1.0 / 1_000_000, output: 5.0 / 1_000_000 };
const MONTHLY_BUDGET_USD = parseFloat(process.env.MONTHLY_BUDGET_USD || "5");

// In-memory usage tracker (resets on server restart)
let usage = {
  month: new Date().getMonth(),
  totalCostUSD: 0,
  totalRequests: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
};

function resetIfNewMonth() {
  const m = new Date().getMonth();
  if (usage.month !== m) {
    usage = {
      month: m,
      totalCostUSD: 0,
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };
  }
}

/* ─── Scraping ───────────────────────────────────────────────── */

async function fetchWebsiteContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 4_000);
}

/* ─── Prompts ────────────────────────────────────────────────── */

const TYPE_INSTRUCTIONS: Record<ScriptType, string> = {

  /* ── UGC ───────────────────────────────────────────────────── */
  ugc: `STYLE UGC TÉMOIGNAGE — Script direct caméra, première personne, storytelling authentique.

Le script doit suivre EXACTEMENT cette structure markdown :

## SCRIPT – [TITRE COURT ET PERSONNEL — ex: "HOMME – COIFFEUR", "MAMAN – MATIN RUSH"]

### HOOK
"[1-2 phrases d'accroche maximum — situation choc, révélation gênante, affirmation surprenante ou question rhétorique — entre guillemets, écrit comme on le dirait à voix haute]"

### CORPS
"[Histoire courte qui justifie le HOOK — 3-6 phrases ultra-courtes, très orales, naturelles.
Chaque phrase sur sa propre ligne pour le rythme.]"
*(indication de jeu — ex: montrer, pointer, réaction faciale, pause)*

### SOLUTION
"[Comment le produit est arrivé naturellement — 2-4 phrases. Jamais vendeur. Factuel et spontané.]"
*(montrer le produit, geste d'application, démonstration rapide)*

### PREUVE
*(indication visuelle — avant/après, résultat visible, démonstration concrète)*
"[Constat direct du résultat — 1-3 phrases courtes, émotionnelles mais honnêtes]"

### RÉSULTAT
"[Intégration dans la routine quotidienne — 2-3 phrases. Analogie simple si possible (ex: aussi automatique que…)]"

### CTA
"[1-2 phrases MAX. Adapte l'un de ces modèles au produit et au problème du script :
→ 'Si t'as le même problème, clique sur le lien en dessous. [Bénéfice concret : Livraison offerte / -15% aujourd'hui / Essai gratuit].'
→ 'Le lien est juste en dessous si tu veux tester. Plus de [X] clients satisfaits.'
→ 'Si t'as le même problème, le lien est en bio.'
→ 'Si tu veux tester, clique sur le lien juste en bio.'
Choisis 'en dessous' pour TikTok, 'en bio' pour Reels/Instagram. Remplace [X] par un chiffre crédible si tu l'as.]"

RÈGLES ABSOLUES POUR CE FORMAT :
- Tout écrit comme on parle VRAIMENT (jamais : "je vous recommande", "ce produit est incroyable", "vous ne serez pas déçu")
- Phrases ultra-courtes — max 8-10 mots par phrase
- Expressions naturelles : "j'étais en mode…", "franchement", "vite fait", "clairement", "ça c'est bon", "et là…"
- Indications de jeu entre *(italiques)* courtes et précises
- Le HOOK doit provoquer curiosité ou identification immédiate
- Respecte scrupuleusement la mise en forme markdown (##, ###, *)`,

  /* ── MICRO-TROTTOIR ─────────────────────────────────────────── */
  micro_trottoir: `STYLE MICRO-TROTTOIR INTERACTIF — Script interview de rue avec questions/réponses branchées.

Le script doit suivre EXACTEMENT cette structure markdown :

## SCRIPT – [TITRE COURT ET ACCROCHEUR]

### HOOK
"[Question directe, courte, intrigante à poser à des passants — ne mentionne pas encore le produit]"

*(indication de tournage — ex: montrer une photo, un visuel avant/après, tenir le produit, etc.)*

### CORPS

**"[Réponse favorable]"**
→ "[Micro-relance pour creuser]"

**"[Réponse neutre ou hésitante]"**
→ "[Micro-relance pour engager]"

**"[Réponse sceptique ou négative]"**
→ "[Micro-relance pour réorienter]"

---

### RELANCE 1

**[Deuxième question — approfondit la perception, ne révèle pas encore le produit]**

**"[Réponse A]"**
→ "[Réaction + micro-question de suivi]"

**"[Réponse B]"**
→ "[Réaction + micro-question de suivi]"

**"[Réponse C]"**
→ "[Réaction + micro-question de suivi]"

---

### RELANCE 2

**[Troisième question — angle émotionnel ou personnel]**

**"[Réponse A]"**
→ "[Réaction]"

**"[Réponse B]"**
→ "[Réaction]"

**"[Réponse C]"**
→ "[Réaction]"

---

### RELANCE 3

**[Question charnière — amène naturellement à la révélation du produit]**

**"[Réponse A — favorable]"**
→ "[Introduire le produit naturellement]"

**"[Réponse B — neutre]"**
→ "[Introduire le produit sous angle différent]"

**"[Réponse C — sceptique]"**
→ "[Introduire le produit en levant le scepticisme]"

---

### TWIST

*(indication visuelle — afficher produit, logo, photos côte à côte, etc.)*
[Révélation percutante : nom produit, bénéfice clé, social proof si dispo, prix si dispo]

> ⚠️ NOTE DE TOURNAGE : [mention légale ou conseil pratique si pertinent]

---

### CTA
[1-2 phrases MAX. Adapte l'un de ces modèles :
→ "Si t'as le même problème, clique sur le lien en dessous. [Bénéfice : Livraison offerte / -15%]."
→ "Le lien est juste en dessous si tu veux tester. Plus de [X] clients satisfaits."
→ "Si t'as le même problème, le lien est en bio."
→ "Si tu veux tester, clique sur le lien juste en bio."
Choisis 'en dessous' pour TikTok, 'en bio' pour Reels/Instagram.]

RÈGLES ABSOLUES :
- HOOK = question courte et directe sans révéler le produit
- Chaque RELANCE couvre 3 réponses : favorable / neutre / sceptique
- Les relances progressent vers la révélation du produit
- Ton de l'intervieweur : curieux, bienveillant, jamais vendeur
- Respecte scrupuleusement la mise en forme markdown (##, ###, **, →, ---, >)`,

  /* ── FACE CAM ───────────────────────────────────────────────── */
  face_cam: `STYLE FACE CAM DIRECT — Même structure que l'UGC témoignage, mais ton encore plus intime.

Utilise la même structure markdown (##, ###) que l'UGC :
## SCRIPT – [TITRE]
### HOOK / ### CORPS / ### SOLUTION / ### PREUVE / ### RÉSULTAT / ### CTA

DIFFÉRENCES vs UGC :
- Ton encore plus proche, comme si tu parlais à ton/ta meilleur(e) ami(e)
- Plus d'hésitations naturelles (ex: "j'sais pas... en fait si", "attends je t'explique")
- Peut briser le 4ème mur : "je te montre directement", "regarde"
- Expressions encore plus familières et spontanées

CTA (### CTA) — 1-2 phrases MAX, adapte l'un de ces modèles :
→ "Si t'as le même problème, clique sur le lien en dessous. [Bénéfice concret]."
→ "Le lien est juste en dessous si tu veux tester. Plus de [X] clients satisfaits."
→ "Si t'as le même problème, le lien est en bio."
→ "Si tu veux tester, clique sur le lien juste en bio."

RÈGLES IDENTIQUES : phrases courtes, langage oral, indications *(en italiques)*, jamais "marketing-speak".`,

  /* ── AUTO ───────────────────────────────────────────────────── */
  auto: `STYLE AUTO-DÉTECTÉ — Analyse le produit et choisis le style le plus naturellement convaincant.

Pour les produits physiques visibles (cosmétiques, capillaire, fitness, mode) → privilégie l'UGC témoignage.
Pour les services / SaaS / applis → privilégie le Face cam direct.
Pour les produits à fort potentiel de curiosité / comparaison → peut aller vers micro-trottoir.

Quelle que soit la décision, utilise la structure markdown avec les sections ## et ### appropriées.`,
};

const DURATION_INSTRUCTIONS: Record<Duration, string> = {
  "0-15":
    "DURÉE 0-15 SECONDES : script ultra-court, maximum 3-4 phrases. Hook immédiat + 1 bénéfice clé + CTA direct.",
  "15-30":
    "DURÉE 15-30 SECONDES : script court, 5-8 phrases. Hook + problème / douleur + solution + CTA.",
  "30-60":
    "DURÉE 30-60 SECONDES : script standard, 8-13 phrases. Structure complète : hook, problème, découverte, 2-3 bénéfices, CTA.",
  "60-120":
    "DURÉE 60-120 SECONDES : script long, 15-22 phrases. Storytelling développé, plusieurs bénéfices détaillés, objection + réponse, CTA fort.",
};

function buildSystemPrompt(scriptType: ScriptType, duration: Duration): string {
  const isMicroTrottoir = scriptType === "micro_trottoir";

  const durationGuidance = isMicroTrottoir
    ? ""
    : `\nDURÉE CIBLE ${duration} SECONDES : ${DURATION_INSTRUCTIONS[duration]}\n`;

  const responseFormat = `FORMAT DE RÉPONSE OBLIGATOIRE :
Retourne les 3 scripts séparés par ces délimiteurs EXACTEMENT — rien d'autre, zero explication, zero commentaire :

<<<EMOTIONAL>>>
[script angle émotionnel complet avec toute sa mise en forme markdown]
<<<PROBLEM_SOLUTION>>>
[script angle problème/solution complet avec toute sa mise en forme markdown]
<<<CURIOSITY>>>
[script angle curiosité/intrigue complet avec toute sa mise en forme markdown]
<<<END>>>`;

  return `Tu es un expert en copywriting UGC, TikTok, Reels et scripts de vente à fort taux de conversion.

${TYPE_INSTRUCTIONS[scriptType]}
${durationGuidance}
${responseFormat}`;
}

/* ─── GET — budget stats ─────────────────────────────────────── */

export async function GET() {
  resetIfNewMonth();
  return NextResponse.json({
    usage: {
      totalRequests: usage.totalRequests,
      totalCostUSD: usage.totalCostUSD,
    },
    budget: MONTHLY_BUDGET_USD,
    remaining: Math.max(0, MONTHLY_BUDGET_USD - usage.totalCostUSD),
    percentUsed: Math.min(
      100,
      (usage.totalCostUSD / MONTHLY_BUDGET_USD) * 100
    ),
  });
}

/* ─── POST — generate scripts ───────────────────────────────── */

export async function POST(request: NextRequest) {
  resetIfNewMonth();

  if (usage.totalCostUSD >= MONTHLY_BUDGET_USD) {
    return NextResponse.json(
      {
        error: `Budget mensuel de $${MONTHLY_BUDGET_USD} atteint. Réinitialisé le 1er du mois prochain.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const {
      url,
      niche,
      description,
      instructions,
      scriptType = "ugc",
      duration = "30-60",
      companyId: explicitCompanyId,
      packageId,
    } = body as {
      url?: string;
      niche?: string;
      description?: string;
      instructions?: string;
      scriptType?: ScriptType;
      duration?: Duration;
      companyId?: string;
      packageId?: string;
    };

    if (!url && !niche && !description) {
      return NextResponse.json(
        { error: "Au moins un champ est requis." },
        { status: 400 }
      );
    }

    // Resolve company: prefer explicit companyId, then auto-detect from URL
    let companyId: string | null = explicitCompanyId ?? null;
    let companyDomain: string | null = null;
    let learningContext = "";

    if (explicitCompanyId) {
      // Explicit company selected from UI
      try {
        const company = await getCompanyById(explicitCompanyId);
        if (company) {
          companyDomain = company.domain;
          learningContext = await buildLearningContext(explicitCompanyId, company);
        }
      } catch {
        // Non-blocking
      }
    } else if (url) {
      // Auto-detect company from URL
      const domain = extractDomain(url);
      if (domain) {
        try {
          const company = await upsertCompany(domain, niche);
          companyId = company.id;
          companyDomain = company.domain;
          learningContext = await buildLearningContext(companyId, company);
        } catch {
          // Non-blocking
        }
      }
    }

    // Build product context
    let productContext = "";

    if (url) {
      try {
        const siteContent = await fetchWebsiteContent(url);
        productContext += `\n\n=== CONTENU DU SITE (${url}) ===\n${siteContent}`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        productContext += `\n\n[Impossible de charger le site — ${msg}]`;
      }
    }

    if (niche) productContext += `\n\nNICHE / SECTEUR : ${niche}`;
    if (description) productContext += `\n\nDESCRIPTION DU PRODUIT : ${description}`;
    if (instructions)
      productContext += `\n\nINSTRUCTIONS SPÉCIFIQUES : ${instructions}`;

    const userMessage = `Génère 3 scripts pour ce produit/service en suivant EXACTEMENT le format et la structure définis.

Les 3 scripts ont chacun un angle différent :
1. EMOTIONAL → place <<<EMOTIONAL>>> — angle émotionnel (histoire personnelle, transformation, ressenti)
2. PROBLEM_SOLUTION → place <<<PROBLEM_SOLUTION>>> — angle problème/solution (douleur reconnue + produit comme réponse)
3. CURIOSITY → place <<<CURIOSITY>>> — angle curiosité/intrigue (révélation inattendue, before/after, chiffre choc, mystère)

Chaque script a son propre HOOK et angle distinct, mais tous respectent la même structure de sections.

Informations sur le produit/service :
${productContext}${learningContext}

Adapte le vocabulaire, les bénéfices et le ton à la cible de ce produit.
Retourne UNIQUEMENT les 3 scripts avec les délimiteurs <<<>>>. Aucune explication.`;

    const maxTokens = scriptType === "micro_trottoir" ? 6_000 : 4_000;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: maxTokens,
      system: buildSystemPrompt(scriptType, duration),
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = msg.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Pas de contenu textuel dans la réponse.");
    }

    const raw = textBlock.text.trim();
    const ALL_TAGS = [
      "<<<EMOTIONAL>>>",
      "<<<PROBLEM_SOLUTION>>>",
      "<<<CURIOSITY>>>",
      "<<<END>>>",
    ];

    const extract = (startTag: string): string => {
      const start = raw.indexOf(startTag);
      if (start === -1) return "";
      const contentStart = start + startTag.length;
      let contentEnd = raw.length;
      for (const tag of ALL_TAGS) {
        if (tag === startTag) continue;
        const pos = raw.indexOf(tag, contentStart);
        if (pos !== -1 && pos < contentEnd) contentEnd = pos;
      }
      return raw.slice(contentStart, contentEnd).trim();
    };

    const scripts: Record<ScriptAngle, string> = {
      emotional: extract("<<<EMOTIONAL>>>"),
      problem_solution: extract("<<<PROBLEM_SOLUTION>>>"),
      curiosity: extract("<<<CURIOSITY>>>"),
    };

    if (!scripts.emotional && !scripts.problem_solution && !scripts.curiosity) {
      throw new Error("Le modèle n'a pas retourné les délimiteurs attendus. Réessaie.");
    }

    // Track usage
    const inputTokens = msg.usage.input_tokens;
    const outputTokens = msg.usage.output_tokens;
    const cost = inputTokens * PRICING.input + outputTokens * PRICING.output;

    usage.totalCostUSD += cost;
    usage.totalRequests += 1;
    usage.totalInputTokens += inputTokens;
    usage.totalOutputTokens += outputTokens;

    // Persist to MongoDB
    const id = randomUUID();
    let scriptIds: string[] = [];

    try {
      await insertGeneration({
        id,
        companyId,
        companyDomain,
        packageId: packageId ?? null,
        scriptType,
        duration,
        inputUrl: url ?? null,
        inputNiche: niche ?? null,
        inputDescription: description ?? null,
        inputInstructions: instructions ?? null,
        costUsd: parseFloat(cost.toFixed(6)),
        inputTokens,
        outputTokens,
        scripts,
      });

      // Create individual script documents if we have a company
      if (companyId) {
        const scriptRows = await createScripts({
          companyId,
          packageId: packageId ?? null,
          generationId: id,
          scripts,
        });
        scriptIds = scriptRows.map((s) => s.id);
      }
    } catch (dbErr: unknown) {
      console.error("⚠️ MongoDB error:", dbErr instanceof Error ? dbErr.message : String(dbErr));
    }

    return NextResponse.json({
      id,
      scriptIds,
      scripts,
      cost: {
        thisRequest: parseFloat(cost.toFixed(6)),
        totalThisMonth: parseFloat(usage.totalCostUSD.toFixed(4)),
        remainingBudget: parseFloat(
          Math.max(0, MONTHLY_BUDGET_USD - usage.totalCostUSD).toFixed(4)
        ),
        percentUsed: parseFloat(
          Math.min(100, (usage.totalCostUSD / MONTHLY_BUDGET_USD) * 100).toFixed(1)
        ),
        inputTokens,
        outputTokens,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Generate API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
