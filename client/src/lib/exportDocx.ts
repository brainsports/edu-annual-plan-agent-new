import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import type { MonthlyPlan, AnnualPlan, DraftField, ProgramInfo } from "@shared/schema";

interface ProgramExportRow {
  category: string;
  subCategory: string;
  programName: string;
  target: string;
  executionDate: string;
  personnel: string;
  content: string;
}

type ExportBlock =
  | { type: "h1" | "h2" | "h3" | "h4"; text: string }
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; rows: { label: string; value: string }[] }
  | { type: "weeklyTable"; weeks: { week: number; tasks: string }[] }
  | { type: "programTable"; programs: ProgramExportRow[] };

const BORDER_STYLE = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: "999999",
};

const CELL_BORDERS = {
  top: BORDER_STYLE,
  bottom: BORDER_STYLE,
  left: BORDER_STYLE,
  right: BORDER_STYLE,
};

function createTableCell(text: string, width: number, bold = false): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20 })],
      }),
    ],
  });
}

function createOverviewTable(rows: { label: string; value: string }[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createTableCell("항목", 25, true),
          createTableCell("내용", 75, true),
        ],
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: [
              createTableCell(row.label, 25, true),
              createTableCell(row.value || "-", 75),
            ],
          })
      ),
    ],
  });
}

function createWeeklyTable(
  weeks: { week: number; tasks: string }[]
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createTableCell("구분", 20, true),
          createTableCell("주요 업무", 80, true),
        ],
      }),
      ...weeks.map(
        (w) =>
          new TableRow({
            children: [
              createTableCell(`${w.week}주`, 20, true),
              createTableCell(w.tasks || "-", 80),
            ],
          })
      ),
    ],
  });
}

function createProgramTable(programs: ProgramExportRow[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createTableCell("대분류", 10, true),
          createTableCell("중분류", 10, true),
          createTableCell("프로그램명", 15, true),
          createTableCell("대상", 10, true),
          createTableCell("실행일자", 12, true),
          createTableCell("수행인력", 10, true),
          createTableCell("사업내용", 33, true),
        ],
      }),
      ...programs.map(
        (p) =>
          new TableRow({
            children: [
              createTableCell(p.category || "-", 10),
              createTableCell(p.subCategory || "-", 10),
              createTableCell(p.programName || "-", 15),
              createTableCell(p.target || "-", 10),
              createTableCell(p.executionDate || "-", 12),
              createTableCell(p.personnel || "-", 10),
              createTableCell(p.content || "-", 33),
            ],
          })
      ),
    ],
  });
}

const toParagraphs = (blocks: ExportBlock[]) => {
  const out: (Paragraph | Table)[] = [];

  for (const b of blocks) {
    if (b.type === "bullets") {
      for (const item of b.items) {
        out.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: item })],
          })
        );
      }
      out.push(new Paragraph({ text: "" }));
      continue;
    }

    if (b.type === "table") {
      out.push(createOverviewTable(b.rows));
      out.push(new Paragraph({ text: "" }));
      continue;
    }

    if (b.type === "weeklyTable") {
      out.push(createWeeklyTable(b.weeks));
      out.push(new Paragraph({ text: "" }));
      continue;
    }

    if (b.type === "programTable") {
      if (b.programs.length > 0) {
        out.push(createProgramTable(b.programs));
        out.push(new Paragraph({ text: "" }));
      } else {
        out.push(
          new Paragraph({
            children: [new TextRun({ text: "배정된 프로그램이 없습니다.", italics: true })],
          })
        );
        out.push(new Paragraph({ text: "" }));
      }
      continue;
    }

    const sizeMap: Record<string, number> = {
      h1: 34,
      h2: 28,
      h3: 24,
      h4: 22,
      p: 20,
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
      })
    );
  }

  return out;
};

const NARROW_MARGIN = { top: 720, right: 720, bottom: 720, left: 720 };

export async function exportDocx(
  filename: string,
  title: string,
  blocks: ExportBlock[]
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

const PART1_SECTION_NAMES: Record<string, string> = {
  necessity: "사업의 필요성",
  evaluationAndFeedback: "프로그램 평가 및 환류",
  satisfaction: "이용자 만족도",
  purpose: "사업목적",
  goals: "사업목표",
};

const PART2_SECTION_NAMES: Record<string, string> = {
  details_보호: "세부사업내용 - 보호프로그램",
  details_교육: "세부사업내용 - 교육프로그램",
  details_문화: "세부사업내용 - 문화프로그램",
  details_정서지원: "세부사업내용 - 정서지원프로그램",
  details_지역연계: "세부사업내용 - 지역사회연계 프로그램",
  evaluation_보호: "평가계획 - 보호프로그램",
  evaluation_교육: "평가계획 - 교육프로그램",
  evaluation_문화: "평가계획 - 문화프로그램",
  evaluation_정서지원: "평가계획 - 정서지원프로그램",
  evaluation_지역연계: "평가계획 - 지역사회연계 프로그램",
};

function partToBlocks(
  partData: Record<string, DraftField> | undefined,
  sectionNames: Record<string, string>
): ExportBlock[] {
  if (!partData) return [];

  const blocks: ExportBlock[] = [];
  const keys = Object.keys(sectionNames);

  for (const key of keys) {
    const field = partData[key];
    if (!field) continue;

    const title = sectionNames[key] || key;
    blocks.push({ type: "h3", text: title });

    if (field.content) {
      const lines = field.content.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        blocks.push({ type: "p", text: line });
      }
    } else {
      blocks.push({ type: "p", text: "(내용 없음)" });
    }

    blocks.push({ type: "p", text: "" });
  }

  return blocks;
}

export async function exportPart1Docx(annualPlan: AnnualPlan | undefined) {
  if (!annualPlan?.part1) {
    throw new Error("PART 1 데이터가 없습니다.");
  }

  const blocks = partToBlocks(annualPlan.part1, PART1_SECTION_NAMES);
  await exportDocx("연간계획서_PART1.docx", "연간사업계획서 PART 1", blocks);
}

export async function exportPart2Docx(annualPlan: AnnualPlan | undefined) {
  if (!annualPlan?.part2) {
    throw new Error("PART 2 데이터가 없습니다.");
  }

  const blocks = partToBlocks(annualPlan.part2, PART2_SECTION_NAMES);
  await exportDocx("연간계획서_PART2.docx", "연간사업계획서 PART 2", blocks);
}

function parseObjectivesJson(objectives: string): {
  objectives: string;
  focus: string;
  notes: string;
} {
  try {
    if (objectives && objectives.startsWith("{")) {
      const parsed = JSON.parse(objectives);
      return {
        objectives: parsed.objectives || "",
        focus: parsed.focus || "",
        notes: parsed.notes || "",
      };
    }
  } catch {}
  return { objectives: objectives || "", focus: "", notes: "" };
}

function filterProgramsByMonth(programs: ProgramInfo[], month: number): ProgramInfo[] {
  return programs.filter((p) => {
    if (p.executionMonth) {
      return p.executionMonth === month;
    }
    if (p.startDate) {
      const dateMatch = p.startDate.match(/\d{4}-(\d{2})/);
      if (dateMatch) {
        return parseInt(dateMatch[1], 10) === month;
      }
    }
    return false;
  });
}

function sortProgramsByCategory(programs: ProgramInfo[]): ProgramInfo[] {
  const categoryOrder = ["보호", "교육", "문화", "정서지원", "지역연계"];
  return [...programs].sort((a, b) => {
    const catA = categoryOrder.indexOf(a.category);
    const catB = categoryOrder.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    if (a.subCategory !== b.subCategory) {
      return a.subCategory.localeCompare(b.subCategory, "ko");
    }
    return a.programName.localeCompare(b.programName, "ko");
  });
}

function monthlyPlanToBlocks(
  plans: MonthlyPlan[],
  allPrograms: ProgramInfo[]
): ExportBlock[] {
  const blocks: ExportBlock[] = [];

  for (const plan of plans) {
    blocks.push({ type: "h2", text: `${plan.month}월 사업계획서` });

    // 사업내용 및 수행인력 테이블 (최우선)
    const monthPrograms = sortProgramsByCategory(
      filterProgramsByMonth(allPrograms, plan.month)
    );
    blocks.push({ type: "h4", text: "사업내용 및 수행인력" });
    blocks.push({
      type: "programTable",
      programs: monthPrograms.map((p) => ({
        category: p.category,
        subCategory: p.subCategory,
        programName: p.programName,
        target: p.targetChildren,
        executionDate: p.executionDate || p.startDate || "",
        personnel: p.personnel || "",
        content: p.serviceContent || p.plan || "",
      })),
    });

    const overviewData = parseObjectivesJson(plan.objectives || "");
    const overview: { label: string; value: string }[] = [
      { label: "사업목표", value: overviewData.objectives },
      { label: "중점사항", value: overviewData.focus },
      { label: "비고", value: overviewData.notes },
    ];

    blocks.push({ type: "h4", text: "월간 사업 개요" });
    blocks.push({ type: "table", rows: overview });

    if (plan.weeklyTasks && plan.weeklyTasks.length > 0) {
      blocks.push({ type: "h4", text: "주요 업무 계획" });
      blocks.push({
        type: "weeklyTable",
        weeks: plan.weeklyTasks.map((wt) => ({
          week: wt.week,
          tasks: Array.isArray(wt.tasks) ? wt.tasks.join(", ") : "",
        })),
      });
    }

    blocks.push({ type: "p", text: "" });
  }

  return blocks;
}

export async function exportFirstHalfMonthlyDocx(
  monthlyPlans: MonthlyPlan[],
  programs: ProgramInfo[]
) {
  const firstHalf = monthlyPlans
    .filter((p) => p.month >= 1 && p.month <= 6)
    .sort((a, b) => a.month - b.month);

  if (firstHalf.length === 0) {
    throw new Error("상반기 월간계획 데이터가 없습니다.");
  }

  const blocks = monthlyPlanToBlocks(firstHalf, programs);
  await exportDocx(
    "월간계획서_상반기.docx",
    "월간사업계획서 (상반기 1~6월)",
    blocks
  );
}

export async function exportSecondHalfMonthlyDocx(
  monthlyPlans: MonthlyPlan[],
  programs: ProgramInfo[]
) {
  const secondHalf = monthlyPlans
    .filter((p) => p.month >= 7 && p.month <= 12)
    .sort((a, b) => a.month - b.month);

  if (secondHalf.length === 0) {
    throw new Error("하반기 월간계획 데이터가 없습니다.");
  }

  const blocks = monthlyPlanToBlocks(secondHalf, programs);
  await exportDocx(
    "월간계획서_하반기.docx",
    "월간사업계획서 (하반기 7~12월)",
    blocks
  );
}
