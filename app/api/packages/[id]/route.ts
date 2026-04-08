import { NextRequest, NextResponse } from "next/server";
import { getPackageById, updatePackage, deletePackage, listScripts } from "@/lib/database";
import type { ScriptType, PackageStatus } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pkg = await getPackageById(id);
    if (!pkg) {
      return NextResponse.json({ error: "Package non trouvé." }, { status: 404 });
    }
    const scripts = await listScripts({ packageId: id });
    return NextResponse.json({ package: pkg, scripts });
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
    const { name, scriptType, status, scriptCount } = body as {
      name?: string;
      scriptType?: ScriptType;
      status?: PackageStatus;
      scriptCount?: number;
    };

    const updated = await updatePackage(id, { name, scriptType, status, scriptCount });
    if (!updated) {
      return NextResponse.json({ error: "Package non trouvé." }, { status: 404 });
    }
    return NextResponse.json({ package: updated });
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
    const ok = await deletePackage(id);
    if (!ok) {
      return NextResponse.json({ error: "Package non trouvé." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
