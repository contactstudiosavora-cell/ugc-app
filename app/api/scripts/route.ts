import { NextRequest, NextResponse } from "next/server";
import { listScripts } from "@/lib/database";
import type { ScriptStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? undefined;
    const packageId = searchParams.get("packageId") ?? undefined;
    const statusParam = searchParams.get("status");

    let status: ScriptStatus | ScriptStatus[] | undefined;
    if (statusParam) {
      const parts = statusParam.split(",") as ScriptStatus[];
      status = parts.length === 1 ? parts[0] : parts;
    }

    const scripts = await listScripts({ companyId, packageId, status });
    return NextResponse.json({ scripts });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
