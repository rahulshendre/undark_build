import "server-only";

// Turn uploaded files into plain text the model can read.
//
// Full PRD pipeline: pdf-parse for PDFs, Tesseract OCR for scans/images,
// mammoth for Word docs, raw text for text/csv. Everything is concatenated
// with [FILE: name] headers so the model knows document boundaries.
//
// Heavy parsers (pdf-parse, tesseract) are dynamically imported so they only
// load inside the Node runtime when actually needed.

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

async function pdfToText(buffer: Buffer): Promise<string> {
  // pdf-parse v2: instantiate PDFParse with the bytes, then getText().
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text;
}

async function imageToText(buffer: Buffer): Promise<string> {
  const { recognize } = await import("tesseract.js");
  const {
    data: { text },
  } = await recognize(buffer, "eng");
  return text;
}

async function docxToText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

async function fileToText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    if (file.type === "application/pdf" || name.endsWith(".pdf")) {
      return await pdfToText(buffer);
    }
    if (IMAGE_TYPES.includes(file.type) || /\.(png|jpe?g|webp)$/.test(name)) {
      return await imageToText(buffer);
    }
    if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      return await docxToText(buffer);
    }
    // Plain text, csv, md, WhatsApp .txt exports, etc.
    return buffer.toString("utf-8");
  } catch (err) {
    return `(could not read this file: ${(err as Error).message})`;
  }
}

/** Extract every file to text and stitch with file-boundary headers. */
export async function extractTextFromFiles(files: File[]): Promise<string> {
  const parts = await Promise.all(
    files.map(async (file) => {
      const text = await fileToText(file);
      return `[FILE: ${file.name}]\n${text.trim()}`;
    }),
  );
  return parts.join("\n\n---\n\n");
}
