import { NextRequest, NextResponse } from "next/server";
import { bulkUpdateScriptStatus } from "@/lib/database";
import type { ScriptStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scriptIds, status } = body as {
      scriptIds: string[];
      status: ScriptStatus;
    };

    if (!Array.isArray(scriptIds) || scriptIds.length === 0) {
      return NextResponse.json({ error: "scriptIds requis." }, { status: 400 });
    }

    if (!["generated", "validated", "in_production", "filmed"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const count = await bulkUpdateScriptStatus(scriptIds, status);
    return NextResponse.json({ success: true, updated: count });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
