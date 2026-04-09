import { NextRequest, NextResponse } from "next/server";
import { listGlobalReferenceScripts, createGlobalReferenceScript, deleteGlobalReferenceScript } from "@/lib/database";
import type { ScriptType } from "@/lib/types";

export async function GET() {
  try {
    const scripts = await listGlobalReferenceScripts();
    return NextResponse.json({ scripts });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let title = "";
    let content = "";
    let scriptType: ScriptType | null = null;
    let sourceType: "manual" | "file" = "manual";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      title = (formData.get("title") as string) ?? "";
      scriptType = (formData.get("scriptType") as ScriptType) || null;
      sourceType = "file";
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
      content = await file.text();
      if (!title) title = file.name.replace(/\.[^.]+$/, "");
    } else {
      const body = await request.json();
      title = body.title ?? "";
      content = body.content ?? "";
      scriptType = body.scriptType ?? null;
      sourceType = "manual";
    }

    if (!content.trim()) return NextResponse.json({ error: "Le contenu est requis." }, { status: 400 });
    if (!title.trim()) title = `Modèle global ${new Date().toLocaleDateString("fr-FR")}`;

    const script = await createGlobalReferenceScript({ title, content: content.trim(), scriptType, sourceType });
    return NextResponse.json({ script });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json() as { id: string };
    if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
    const ok = await deleteGlobalReferenceScript(id);
    if (!ok) return NextResponse.json({ error: "Non trouvé." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
