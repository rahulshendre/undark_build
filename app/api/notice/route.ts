import { NextRequest, NextResponse } from "next/server";
import { draftNotice } from "@/lib/ai";
import { getCase, saveCase } from "@/lib/store";
import type { NoticeType } from "@/packages/domain";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { caseId, noticeType } = (await req.json()) as {
    caseId: string;
    noticeType: NoticeType;
  };

  const c = await getCase(caseId);
  if (!c) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  try {
    const text = await draftNotice(c, noticeType);
    // Cache the latest draft on the case so it survives a reload.
    await saveCase({ ...c, notice_draft: text });
    return NextResponse.json({ text });
  } catch (err) {
    console.error("notice draft failed:", (err as Error).message);
    return NextResponse.json(
      { error: "Could not draft the notice." },
      { status: 500 },
    );
  }
}
