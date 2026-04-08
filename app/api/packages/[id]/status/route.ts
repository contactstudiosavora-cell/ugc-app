import { NextRequest, NextResponse } from "next/server";
import { updatePackage } from "@/lib/database";
import type { PackageStatus } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = (await request.json()) as { status: PackageStatus };

    if (!["active", "filming", "completed"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const updated = await updatePackage(id, { status });
    if (!updated) {
      return NextResponse.json({ error: "Package non trouvé." }, { status: 404 });
    }
    return NextResponse.json({ package: updated });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
