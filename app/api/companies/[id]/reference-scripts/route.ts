import { NextRequest, NextResponse } from "next/server";
import { listReferenceScripts, createReferenceScript, deleteReferenceScript } from "@/lib/database";
import type { ScriptType } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scripts = await listReferenceScripts(id);
    return NextResponse.json({ scripts });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";

    let title = "";
    let content = "";
    let scriptType: ScriptType | null = null;
    let sourceType: "manual" | "file" = "manual";

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await request.formData();
      title = (formData.get("title") as string) ?? "";
      scriptType = (formData.get("scriptType") as ScriptType) || null;
      sourceType = "file";

      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
      }

      // Read file as text (works for .txt — PDF text will be extracted client-side)
      content = await file.text();
      if (!title) title = file.name.replace(/\.[^.]+$/, "");
    } else {
      // JSON body (copy-paste)
      const body = await request.json();
      title = body.title ?? "";
      content = body.content ?? "";
      scriptType = body.scriptType ?? null;
      sourceType = "manual";
    }

    if (!content.trim()) {
      return NextResponse.json({ error: "Le contenu est requis." }, { status: 400 });
    }
    if (!title.trim()) title = `Modèle ${new Date().toLocaleDateString("fr-FR")}`;

    const script = await createReferenceScript({ companyId: id, title, content: content.trim(), scriptType, sourceType });
    return NextResponse.json({ script });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { id: scriptId } = await request.json() as { id: string };
    if (!scriptId) return NextResponse.json({ error: "id requis." }, { status: 400 });
    const ok = await deleteReferenceScript(scriptId);
    if (!ok) return NextResponse.json({ error: "Non trouvé." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
