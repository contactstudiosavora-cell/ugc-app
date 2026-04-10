import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/database";
import type { PackageDoc, ScriptDoc, CompanyDoc } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const db = await getDb();

    // Find package by shareToken
    const pkg = await db.collection<PackageDoc>("packages").findOne({ shareToken: token });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Get scripts for this package
    const scripts = await db
      .collection<ScriptDoc>("scripts")
      .find({ packageId: pkg._id })
      .sort({ createdAt: 1 })
      .toArray();

    // Get client feedbacks for these scripts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feedbacks = await db.collection<any>("client_feedbacks")
      .find({ packageId: pkg._id })
      .toArray()
      .catch(() => []);

    // Get company info
    const company = await db.collection<CompanyDoc>("companies").findOne({ _id: pkg.companyId });

    return NextResponse.json({
      package: {
        id: pkg._id,
        name: pkg.name,
        scriptType: pkg.scriptType,
        status: pkg.status,
        scriptCount: pkg.scriptCount,
        companyName: company?.name || null,
        createdAt: pkg.createdAt instanceof Date ? pkg.createdAt.toISOString() : pkg.createdAt,
      },
      scripts: scripts.map((s) => ({
        id: s._id,
        angle: s.angle,
        content: s.content,
        status: s.status,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      feedbacks: feedbacks.map((f: any) => ({
        id: f._id,
        scriptId: f.scriptId,
        modifiedContent: f.modifiedContent,
        comments: f.comments,
        validated: f.validated ?? false,
        createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH - Save client modifications, comments, and validation for a specific script
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json() as {
      scriptId: string;
      modifiedContent?: string;
      comments?: string;
      validated?: boolean;
    };

    const db = await getDb();

    // Find package by shareToken
    const pkg = await db.collection<PackageDoc>("packages").findOne({ shareToken: token });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Upsert feedback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.collection<any>("client_feedbacks").updateOne(
      { packageId: pkg._id, scriptId: body.scriptId },
      {
        $set: {
          modifiedContent: body.modifiedContent || null,
          comments: body.comments || null,
          validated: body.validated ?? false,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          packageId: pkg._id,
          scriptId: body.scriptId,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST - Validate entire package
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const db = await getDb();

    // Find package by shareToken
    const pkg = await db.collection<PackageDoc>("packages").findOne({ shareToken: token });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Update package status to completed (client validated)
    await db.collection<PackageDoc>("packages").updateOne(
      { _id: pkg._id },
      {
        $set: {
          status: "completed",
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true, message: "Package validé par le client" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
