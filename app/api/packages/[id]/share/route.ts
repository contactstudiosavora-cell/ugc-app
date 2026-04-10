import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/database";
import { randomBytes } from "crypto";
import type { PackageDoc } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    // Check if package exists
    const pkg = await db.collection<PackageDoc>("packages").findOne({ _id: id });
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Generate unique share token if not exists
    let shareToken = pkg.shareToken;
    if (!shareToken) {
      shareToken = randomBytes(16).toString("hex");
      await db.collection<PackageDoc>("packages").updateOne(
        { _id: id },
        { $set: { shareToken, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({ shareToken });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
