import { NextRequest, NextResponse } from "next/server";
import { getShareToken, updateShareTokenClientResponse, getScriptById } from "@/lib/database";

// GET — client fetches script content via token
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const shareToken = await getShareToken(token);
    if (!shareToken) return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });

    // Check expiry
    if (shareToken.expiresAt && new Date(shareToken.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Ce lien a expiré." }, { status: 410 });
    }

    // Get the script content
    const script = await getScriptById(shareToken.scriptId);
    if (!script) return NextResponse.json({ error: "Script introuvable." }, { status: 404 });

    // Return sanitized data — no AI references, no internal metadata
    return NextResponse.json({
      share: shareToken,
      script: {
        id: script.id,
        content: shareToken.clientContent ?? script.content,
        angle: script.angle,
        companyName: shareToken.companyName,
        createdAt: script.createdAt,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH — client submits their response (edits, comment, status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const shareToken = await getShareToken(token);
    if (!shareToken) return NextResponse.json({ error: "Lien invalide." }, { status: 404 });

    if (shareToken.expiresAt && new Date(shareToken.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Ce lien a expiré." }, { status: 410 });
    }

    const body = await request.json() as {
      clientName?: string;
      clientContent?: string | null;
      clientComment?: string | null;
      clientStatus: "pending" | "approved" | "changes_requested";
    };

    if (!body.clientStatus) {
      return NextResponse.json({ error: "clientStatus requis." }, { status: 400 });
    }

    const ok = await updateShareTokenClientResponse(token, {
      clientName: body.clientName,
      clientContent: body.clientContent,
      clientComment: body.clientComment,
      clientStatus: body.clientStatus,
    });

    if (!ok) return NextResponse.json({ error: "Mise à jour échouée." }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
