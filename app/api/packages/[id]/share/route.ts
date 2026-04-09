import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/database";
import { randomBytes } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const db = await getDb();
    
    // Check if package exists
    const pkg = await db.packages.findOne({ _id: id }, { projection: { _id: 0 } });
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Generate unique share token if not exists
    let shareToken = pkg.shareToken;
    if (!shareToken) {
      shareToken = randomBytes(16).toString("hex");
      await db.packages.updateOne(
        { _id: id },
        { $set: { shareToken, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({ shareToken });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
