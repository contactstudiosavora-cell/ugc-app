import { NextRequest, NextResponse } from "next/server";
import {
  getScriptById,
  createShareToken,
  listShareTokensForScript,
  deleteShareToken,
} from "@/lib/database";

// GET — list all share links for a script
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tokens = await listShareTokensForScript(id);
    return NextResponse.json({ tokens });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — create a new share link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const script = await getScriptById(id);
    if (!script) return NextResponse.json({ error: "Script non trouvé." }, { status: 404 });

    const body = await request.json().catch(() => ({})) as {
      clientName?: string;
      expiresInDays?: number;
    };

    const token = await createShareToken({
      scriptId: id,
      companyId: script.companyId,
      companyName: script.companyName ?? null,
      clientName: body.clientName ?? null,
      expiresInDays: body.expiresInDays,
    });

    return NextResponse.json({ token });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE — revoke a share link
export async function DELETE(request: NextRequest) {
  try {
    const { token } = await request.json() as { token: string };
    if (!token) return NextResponse.json({ error: "token requis." }, { status: 400 });
    const ok = await deleteShareToken(token);
    if (!ok) return NextResponse.json({ error: "Non trouvé." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
