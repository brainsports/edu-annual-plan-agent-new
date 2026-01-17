import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

type ExportBlock =
  | { type: "h1" | "h2" | "h3" | "h4"; text: string }
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] };

const toParagraphs = (blocks: ExportBlock[]) => {
  const out: Paragraph[] = [];

  for (const b of blocks) {
    if (b.type === "bullets") {
      for (const item of b.items) {
        out.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: item })],
          }),
        );
      }
      out.push(new Paragraph({ text: "" }));
      continue;
    }

    const sizeMap: Record<string, number> = {
      h1: 34,
      h2: 28,
      h3: 24,
      h4: 22,
      p: 22,
    };

    out.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: b.text,
            bold: b.type !== "p",
            size: sizeMap[b.type],
          }),
        ],
      }),
    );
  }

  return out;
};

/** ✅ Word 여백 "좁게" 느낌(대략 0.5인치 = 720 twips) */
const NARROW_MARGIN = { top: 720, right: 720, bottom: 720, left: 720 };

export async function exportDocx(
  filename: string,
  title: string,
  blocks: ExportBlock[],
) {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: NARROW_MARGIN },
        },
        children: [
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({ text: title, bold: true, size: 36 })],
          }),
          ...toParagraphs(blocks),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
