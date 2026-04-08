import { NextRequest, NextResponse } from "next/server";
import { getScriptById, updateScript, deleteScript } from "@/lib/database";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const script = await getScriptById(id);
    if (!script) {
      return NextResponse.json({ error: "Script non trouvé." }, { status: 404 });
    }
    return NextResponse.json({ script });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, notes, packageId } = body as {
      content?: string;
      notes?: string;
      packageId?: string | null;
    };

    const updated = await updateScript(id, { content, notes, packageId });
    if (!updated) {
      return NextResponse.json({ error: "Script non trouvé." }, { status: 404 });
    }
    return NextResponse.json({ script: updated });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = await deleteScript(id);
    if (!ok) {
      return NextResponse.json({ error: "Script non trouvé." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
