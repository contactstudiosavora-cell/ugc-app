import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/database";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    const db = await getDb();
    
    // Find package by shareToken
    const pkg = await db.packages.findOne(
      { shareToken: token },
      { projection: { _id: 1, companyId: 1, name: 1, scriptType: 1, status: 1, scriptCount: 1, createdAt: 1 } }
    );
    
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Get scripts for this package
    const scripts = await db.scripts.find(
      { packageId: pkg._id },
      { projection: { _id: 1, angle: 1, content: 1, status: 1, createdAt: 1 } }
    ).toArray();

    // Get client feedbacks for these scripts
    const feedbacks = await db.clientFeedbacks?.find(
      { packageId: pkg._id },
      { projection: { _id: 1, scriptId: 1, modifiedContent: 1, comments: 1, validated: 1, createdAt: 1 } }
    ).toArray() || [];

    // Get company info
    const company = await db.companies.findOne(
      { _id: pkg.companyId },
      { projection: { name: 1 } }
    );

    return NextResponse.json({
      package: {
        id: pkg._id,
        name: pkg.name,
        scriptType: pkg.scriptType,
        status: pkg.status,
        scriptCount: pkg.scriptCount,
        companyName: company?.name || null,
        createdAt: pkg.createdAt.toISOString(),
      },
      scripts: scripts.map((s) => ({
        id: s._id,
        angle: s.angle,
        content: s.content,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
      feedbacks: feedbacks.map((f: any) => ({
        id: f._id,
        scriptId: f.scriptId,
        modifiedContent: f.modifiedContent,
        comments: f.comments,
        validated: f.validated ?? false,
        createdAt: f.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH - Save client modifications, comments, and validation for a specific script
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    const body = await req.json() as {
      scriptId: string;
      modifiedContent?: string;
      comments?: string;
      validated?: boolean;
    };

    const db = await getDb();
    
    // Find package by shareToken
    const pkg = await db.packages.findOne(
      { shareToken: token },
      { projection: { _id: 1 } }
    );
    
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Create or ensure clientFeedbacks collection exists
    if (!db.clientFeedbacks) {
      await db.createCollection("clientFeedbacks");
    }

    // Upsert feedback
    await db.clientFeedbacks.updateOne(
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

// POST - Validate package
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    const db = await getDb();
    
    // Find package by shareToken
    const pkg = await db.packages.findOne(
      { shareToken: token },
      { projection: { _id: 1 } }
    );
    
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Update package status to indicate client validation
    await db.packages.updateOne(
      { _id: pkg._id },
      {
        $set: {
          status: "completed",
          clientValidatedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true, message: "Package validé par le client" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
