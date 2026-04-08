import { NextRequest, NextResponse } from "next/server";
import { listCompanies, createCompany } from "@/lib/database";
import type { ScriptType } from "@/lib/types";

export async function GET() {
  try {
    const companies = await listCompanies();
    return NextResponse.json({ companies });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      domain,
      niche,
      description,
      communicationStyle,
      targetAudience,
      servicesProducts,
      brandVoice,
      contentTypes,
    } = body as {
      name: string;
      domain?: string;
      niche?: string;
      description?: string;
      communicationStyle?: string;
      targetAudience?: string;
      servicesProducts?: string;
      brandVoice?: string;
      contentTypes?: ScriptType[];
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Le nom est requis." }, { status: 400 });
    }

    const company = await createCompany({
      name,
      domain,
      niche,
      description,
      communicationStyle,
      targetAudience,
      servicesProducts,
      brandVoice,
      contentTypes,
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
