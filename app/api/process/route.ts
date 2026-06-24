import { NextRequest, NextResponse } from "next/server";
import { extractTextFromFiles } from "@/lib/extract";
import { extractCase, analyzeCase } from "@/lib/ai";
import { saveCase } from "@/lib/store";
import { newId } from "@/lib/utils";
import type { Case } from "@/packages/domain";

// Document parsing + two model calls. Needs the Node runtime and time.
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let files: File[];
  try {
    const formData = await req.formData();
    files = formData.getAll("files").filter((f): f is File => f instanceof File);
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart upload." },
      { status: 400 },
    );
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  }

  try {
    // 1. Read every document to text.
    const documentText = await extractTextFromFiles(files);

    // 2. Structured facts, then 3. the analyst's read.
    const facts = await extractCase(documentText);
    const analysis = await analyzeCase(facts);

    // 4. Persist and hand back the id.
    const c: Case = {
      ...facts,
      ...analysis,
      id: newId(),
      created_at: new Date().toISOString(),
      status: "ready",
      documents_uploaded: files.map((f) => f.name),
      notice_draft: null,
    };
    await saveCase(c);

    return NextResponse.json({ id: c.id });
  } catch (err) {
    console.error("process failed:", (err as Error).message);
    return NextResponse.json(
      { error: "Could not process the case. Check the server logs." },
      { status: 500 },
    );
  }
}
