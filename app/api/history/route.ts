import { NextRequest, NextResponse } from "next/server";
import { listHistory, setValidation, deleteGeneration, updateGenerationScript } from "@/lib/database";
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

// PATCH — validate / unvalidate an entry OR update script content
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id: string;
      validated?: ScriptAngle | null;
      angle?: string;
      content?: string;
    };
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "id requis." }, { status: 400 });
    }

    // Content update
    if (body.content !== undefined && body.angle) {
      const ok = await updateGenerationScript(id, body.angle, body.content);
      if (!ok) return NextResponse.json({ error: "Entrée non trouvée." }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    // Validation update
    const ok = await setValidation(id, body.validated ?? null);
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
