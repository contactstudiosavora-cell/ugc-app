import { NextRequest, NextResponse } from "next/server";
import { listPackages, createPackage } from "@/lib/database";
import type { ScriptType } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? undefined;
    const packages = await listPackages(companyId);
    return NextResponse.json({ packages });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, name, scriptType, scriptCount } = body as {
      companyId: string;
      name: string;
      scriptType: ScriptType;
      scriptCount?: number;
    };

    if (!companyId || !name?.trim()) {
      return NextResponse.json(
        { error: "companyId et name sont requis." },
        { status: 400 }
      );
    }

    const pkg = await createPackage({ companyId, name, scriptType, scriptCount });
    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
