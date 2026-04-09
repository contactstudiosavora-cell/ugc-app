/**
 * POST /api/init-db
 *
 * One-time database migration & index setup:
 *  1. Creates indexes on all collections for performance
 *  2. Migrates existing companies → adds new profile fields (null defaults)
 *  3. Migrates existing generations → adds packageId field (null default)
 *  4. Creates scripts collection entries from validated generations (backfill)
 *
 * Safe to run multiple times (idempotent).
 */

import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI as string;
const DB_NAME = process.env.DB_NAME || "ugc_scripts_db";

export async function POST() {
  if (!MONGODB_URI) {
    return NextResponse.json({ error: "MONGODB_URI non configuré." }, { status: 500 });
  }

  const client = new MongoClient(MONGODB_URI);
  const results: string[] = [];

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    /* ── 1. INDEXES ────────────────────────────────────────────── */

    // companies
    await db.collection("companies").createIndex({ domain: 1 }, { unique: true, background: true });
    await db.collection("companies").createIndex({ updatedAt: -1 }, { background: true });
    results.push("✓ Index companies (domain unique, updatedAt)");

    // generations
    await db.collection("generations").createIndex({ companyId: 1, createdAt: -1 }, { background: true });
    await db.collection("generations").createIndex({ validatedAngle: 1 }, { background: true });
    await db.collection("generations").createIndex({ packageId: 1 }, { sparse: true, background: true });
    results.push("✓ Index generations (companyId+createdAt, validatedAngle, packageId)");

    // packages
    await db.collection("packages").createIndex({ companyId: 1, createdAt: -1 }, { background: true });
    await db.collection("packages").createIndex({ status: 1 }, { background: true });
    results.push("✓ Index packages (companyId+createdAt, status)");

    // scripts
    await db.collection("scripts").createIndex({ companyId: 1, createdAt: -1 }, { background: true });
    await db.collection("scripts").createIndex({ packageId: 1 }, { sparse: true, background: true });
    await db.collection("scripts").createIndex({ status: 1, createdAt: -1 }, { background: true });
    await db.collection("scripts").createIndex({ generationId: 1 }, { background: true });
    results.push("✓ Index scripts (companyId, packageId, status+createdAt, generationId)");

    // reference_scripts
    await db.collection("reference_scripts").createIndex({ companyId: 1, createdAt: -1 }, { background: true });
    results.push("✓ Index reference_scripts (companyId+createdAt)");

    /* ── 2. MIGRATE COMPANIES — add new profile fields ─────────── */

    const companiesMigrated = await db.collection("companies").updateMany(
      {
        $or: [
          { description: { $exists: false } },
          { communicationStyle: { $exists: false } },
          { targetAudience: { $exists: false } },
          { servicesProducts: { $exists: false } },
          { brandVoice: { $exists: false } },
          { contentTypes: { $exists: false } },
        ],
      },
      {
        $set: {
          description: null,
          communicationStyle: null,
          targetAudience: null,
          servicesProducts: null,
          brandVoice: null,
          contentTypes: [],
        },
        // Only set fields that don't exist — don't overwrite existing values
      }
    );
    results.push(`✓ Entreprises migrées : ${companiesMigrated.modifiedCount} document(s) mis à jour`);

    /* ── 3. MIGRATE GENERATIONS — add packageId field ──────────── */

    const generationsMigrated = await db.collection("generations").updateMany(
      { packageId: { $exists: false } },
      { $set: { packageId: null } }
    );
    results.push(`✓ Générations migrées : ${generationsMigrated.modifiedCount} document(s) mis à jour`);

    /* ── 4. BACKFILL SCRIPTS from validated generations ────────── */

    // Find all validated generations that don't already have script docs
    const validatedGens = await db
      .collection("generations")
      .find({ validatedAngle: { $ne: null } })
      .toArray();

    let scriptsCreated = 0;

    for (const gen of validatedGens) {
      // Check if scripts already exist for this generation
      const existing = await db
        .collection("scripts")
        .countDocuments({ generationId: gen._id });

      if (existing > 0) continue; // Already backfilled

      if (!gen.companyId) continue; // No company → skip

      // Create the validated script document
      const angle = gen.validatedAngle;
      const content = gen.scripts?.[angle];
      if (!content) continue;

      const { randomUUID } = await import("crypto");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.collection<any>("scripts").insertOne({
        _id: randomUUID(),
        companyId: gen.companyId,
        packageId: gen.packageId ?? null,
        generationId: gen._id,
        angle,
        content,
        status: "validated",
        validatedAt: gen.validatedAt ?? new Date(),
        inProductionAt: null,
        filmedAt: null,
        notes: "",
        createdAt: gen.createdAt ?? new Date(),
      });
      scriptsCreated++;
    }

    results.push(`✓ Scripts rétro-créés depuis générations validées : ${scriptsCreated}`);

    /* ── 5. REPAIR — fix null/missing content in scripts ────────── */

    const nullContentFixed = await db.collection("scripts").updateMany(
      { $or: [{ content: null }, { content: { $exists: false } }] },
      { $set: { content: "" } }
    );
    if (nullContentFixed.modifiedCount > 0) {
      results.push(`✓ Scripts réparés (content null → "") : ${nullContentFixed.modifiedCount}`);
    }

    const nullStatusFixed = await db.collection("scripts").updateMany(
      { $or: [{ status: null }, { status: { $exists: false } }] },
      { $set: { status: "generated" } }
    );
    if (nullStatusFixed.modifiedCount > 0) {
      results.push(`✓ Scripts réparés (status null → generated) : ${nullStatusFixed.modifiedCount}`);
    }

    /* ── 6. SUMMARY ─────────────────────────────────────────────── */

    const companiesCount = await db.collection("companies").countDocuments();
    const generationsCount = await db.collection("generations").countDocuments();
    const scriptsCount = await db.collection("scripts").countDocuments();
    const packagesCount = await db.collection("packages").countDocuments();

    return NextResponse.json({
      success: true,
      results,
      collections: {
        companies: companiesCount,
        generations: generationsCount,
        scripts: scriptsCount,
        packages: packagesCount,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), results },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
