import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function GET() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || "ugc_scripts_db";

  if (!uri) {
    return NextResponse.json({ ok: false, error: "MONGODB_URI is not set" }, { status: 500 });
  }

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const generationCount = await db.collection("generations").countDocuments();
    return NextResponse.json({
      ok: true,
      db: dbName,
      collections: collections.map((c) => c.name),
      generationCount,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    await client?.close();
  }
}
