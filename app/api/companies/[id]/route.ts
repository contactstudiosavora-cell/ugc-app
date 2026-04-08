import { NextRequest, NextResponse } from "next/server";
import {
  getCompanyById,
  updateCompany,
  deleteCompany,
  listPackages,
  listScripts,
  listHistory,
} from "@/lib/database";
import type { ScriptType } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée." }, { status: 404 });
    }
    const packages = await listPackages(id);
    const scripts = await listScripts({ companyId: id });
    const history = await listHistory({ companyId: id, limit: 50 });

    return NextResponse.json({ company, packages, scripts, history });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      niche,
      description,
      communicationStyle,
      targetAudience,
      servicesProducts,
      brandVoice,
      contentTypes,
    } = body as {
      name?: string;
      niche?: string;
      description?: string;
      communicationStyle?: string;
      targetAudience?: string;
      servicesProducts?: string;
      brandVoice?: string;
      contentTypes?: ScriptType[];
    };

    const updated = await updateCompany(id, {
      name,
      niche,
      description,
      communicationStyle,
      targetAudience,
      servicesProducts,
      brandVoice,
      contentTypes,
    });

    if (!updated) {
      return NextResponse.json({ error: "Entreprise non trouvée." }, { status: 404 });
    }

    return NextResponse.json({ company: updated });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = await deleteCompany(id);
    if (!ok) {
      return NextResponse.json({ error: "Entreprise non trouvée." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
