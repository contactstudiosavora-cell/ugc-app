import { NextRequest, NextResponse } from "next/server";
import { listHistory, setValidation, deleteGeneration } from "@/lib/database";
import type { ScriptAngle } from "@/lib/types";

// GET — return all history entries
export async function GET() {
  try {
    const history = await listHistory();
    return NextResponse.json({ history });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH — validate / unvalidate an entry
export async function PATCH(request: NextRequest) {
  try {
    const { id, validated } = (await request.json()) as {
      id: string;
      validated: ScriptAngle | null;
    };
    if (!id) {
      return NextResponse.json({ error: "id requis." }, { status: 400 });
    }
    const ok = await setValidation(id, validated ?? null);
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
    const ok = await deleteGeneration(id);
    if (!ok) {
      return NextResponse.json({ error: "Entrée non trouvée." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
