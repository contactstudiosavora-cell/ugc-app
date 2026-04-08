import { NextRequest, NextResponse } from "next/server";
import {
  readHistory,
  updateHistoryEntry,
  deleteHistoryEntry,
} from "@/lib/db";
import type { ScriptAngle } from "@/lib/types";

// GET — return all history entries
export async function GET() {
  try {
    const history = readHistory();
    return NextResponse.json({ history });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH — validate / update an entry
export async function PATCH(request: NextRequest) {
  try {
    const { id, validated } = (await request.json()) as {
      id: string;
      validated: ScriptAngle | null;
    };
    if (!id) {
      return NextResponse.json({ error: "id requis." }, { status: 400 });
    }
    const ok = updateHistoryEntry(id, { validated });
    if (!ok) {
      return NextResponse.json({ error: "Entrée non trouvée." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — remove an entry
export async function DELETE(request: NextRequest) {
  try {
    const { id } = (await request.json()) as { id: string };
    if (!id) {
      return NextResponse.json({ error: "id requis." }, { status: 400 });
    }
    const ok = deleteHistoryEntry(id);
    if (!ok) {
      return NextResponse.json({ error: "Entrée non trouvée." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
