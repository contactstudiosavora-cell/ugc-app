import { NextRequest, NextResponse } from "next/server";
import { updateScriptStatus } from "@/lib/database";
import type { ScriptStatus } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body as { status: ScriptStatus; notes?: string };

    if (!["generated", "validated", "in_production", "filmed"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const ok = await updateScriptStatus(id, status, { notes });
    if (!ok) {
      return NextResponse.json({ error: "Script non trouvé." }, { status: 404 });
    }
    return NextResponse.json({ success: true, status });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
