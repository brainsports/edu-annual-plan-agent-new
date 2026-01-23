import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { createRequire } from "module";
import { randomUUID } from "crypto";
import { GoogleGenAI } from "@google/genai";

import {
  type UploadedFile,
  type ProgramInfo,
  type ProgramCategory,
  classifyRequestSchema,
  generateRequestSchema,
  generateMonthlyRequestSchema,
} from "@shared/schema";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/* =========================================================
   Gemini helpers (한 번만 정의)
========================================================= */
function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || "";
}

function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in server env");
  }
  return new GoogleGenAI({ apiKey });
}

function getGeminiModel() {
  // 필요하면 서버 env에서 바꿔 쓸 수 있게
  return process.env.GEMINI_MODEL || "gemini-1.5-flash";
}

function safeExtractTextFromGemini(result: any): string {
  const text =
    result?.text ??
    result?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || "")
      .join("") ??
    "";
  return String(text || "");
}

async function geminiText(prompt: string, system?: string) {
  const ai = getGeminiClient();
  const model = getGeminiModel();

  const contents = [
    ...(system
      ? [{ role: "user" as const, parts: [{ text: `SYSTEM:\n${system}` }] }]
      : []),
    { role: "user" as const, parts: [{ text: prompt }] },
  ];

  const result = await ai.models.generateContent({
    model,
    contents,
    config: {
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  });

  return safeExtractTextFromGemini(result);
}

async function geminiJson(prompt: string, system?: string): Promise<any> {
  const ai = getGeminiClient();
  const model = getGeminiModel();

  const contents = [
    ...(system
      ? [{ role: "user" as const, parts: [{ text: `SYSTEM:\n${system}` }] }]
      : []),
    { role: "user" as const, parts: [{ text: prompt }] },
  ];

  const result = await ai.models.generateContent({
    model,
    contents,
    config: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const raw = safeExtractTextFromGemini(result).trim();

  // 1) 바로 JSON 시도
  try {
    return JSON.parse(raw);
  } catch {
    // 2) 코드펜스/설명 섞이면 JSON 덩어리만 추출
    const jsonMatch = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
    if (jsonMatch?.[0]) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // fallthrough
      }
    }
  }

  return null;
}

/* =========================================================
   Utility: PDF text + keyword fallback
========================================================= */
function normalizeTextForKeywords(text: string) {
  return (text || "")
    .replace(/[^\u3131-\u318E\uAC00-\uD7A3a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywordsSimple(text: string, topN: number = 6) {
  const stop = new Set([
    "그리고",
    "또한",
    "따라서",
    "하지만",
    "있다",
    "없다",
    "한다",
    "된다",
    "대한",
    "위해",
    "사업",
    "프로그램",
    "지역",
    "아동",
    "센터",
    "운영",
    "지원",
    "필요",
    "목적",
    "계획",
    "연간",
    "월간",
    "평가",
    "활동",
    "실시",
    "진행",
  ]);

  const words = normalizeTextForKeywords(text)
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length >= 2)
    .filter((w) => !stop.has(w));

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w);
}

function defaultNeedsKeywords() {
  return ["돌봄공백", "정서불안", "학습결손"];
}
function defaultRegionKeywords() {
  return ["자원부족", "접근성", "방과후공백"];
}

/* =========================================================
   Routes
========================================================= */
export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  /** 1) 업로드 */
  app.post(
    "/api/upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: "No file uploaded" });

        const pdfData = await pdfParse(file.buffer);
        const extractedText = String(pdfData?.text || "");

        const uploadedFile: UploadedFile = {
          id: randomUUID(),
          name: file.originalname,
          type: "evaluation",
          extractedText,
          uploadedAt: new Date().toISOString(),
        };

        await storage.addUploadedFile(uploadedFile);
        return res.json(uploadedFile);
      } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({ error: "Failed to process file" });
      }
    },
  );

  /**
   * ✅ 1-1) 연간 Part1 - 사업의 필요성 자동채움
   * - PDF 텍스트가 충분하면: Gemini로 '이용아동 욕구/문제점' + '지역 환경적 특성'을 생성 + 키워드(각 3개)
   * - 텍스트가 너무 짧거나 API 키가 없으면: 안전한 기본 키워드 + 빈 내용 반환(Stub fallback)
   */
  app.post(
    "/api/annual/part1/necessity/autofill",
    upload.single("file"),
    async (req: Request, res: Response) => {
      const hasFile = !!req.file;
      const fileName = req.file?.originalname || null;

      try {
        // 1) PDF 텍스트 추출
        let extractedText = "";
        if (req.file?.buffer) {
          try {
            const pdfData = await pdfParse(req.file.buffer);
            extractedText = String(pdfData?.text || "");
          } catch (e) {
            console.warn("pdfParse failed, continue with empty text:", e);
          }
        }

        // 2) 최소 텍스트 기준(너무 짧으면 Gemini 호출해도 품질이 떨어짐)
        const baseText = (extractedText || "").trim();
        const baseTextShort = baseText.length < 500;

        // 3) 키워드 기본(텍스트 기반 간단 추출 + fallback)
        const baseKw = baseText ? extractKeywordsSimple(baseText, 6) : [];
        const needsKeywords =
          baseKw.length >= 3 ? baseKw.slice(0, 3) : defaultNeedsKeywords();
        const regionKeywords =
          baseKw.length >= 6 ? baseKw.slice(3, 6) : defaultRegionKeywords();

        // 4) API 키가 없으면: 안전 stub
        const apiKey = getGeminiApiKey();
        if (!apiKey || baseTextShort) {
          return res.json({
            ok: true,
            source: !apiKey ? "stub-no-key" : "stub-short-text",
            received: { hasFile, fileName },
            content: !apiKey
              ? "현재 서버에 GEMINI_API_KEY가 없어 자동작성은 키워드만 제공한다."
              : "PDF에서 추출된 텍스트가 너무 짧아 자동작성은 키워드만 제공한다.",
            keywords: { needs: needsKeywords, region: regionKeywords },
            fields: {
              needsProblem: { content: "", keywords: needsKeywords },
              regionSummary: { content: "", keywords: regionKeywords },
            },
          });
        }

        // 5) Gemini로 실제 내용 생성 (JSON 강제)
        const prompt = `다음은 지역아동센터 관련 PDF에서 추출한 텍스트이다.
이 텍스트를 근거로, 연간사업계획서 Part1의 '사업의 필요성'을 자동 작성하기 위한 JSON만 반환하라.

[작성 대상]
1) 이용아동의 욕구 및 문제점(needsProblem)
2) 지역 환경적 특성(regionSummary)

[출력 JSON 스키마]
{
  "keywords": {
    "needs": ["키워드", "키워드", "키워드"],
    "region": ["키워드", "키워드", "키워드"]
  },
  "fields": {
    "needsProblem": { "content": "2~4문장", "keywords": ["", "", ""] },
    "regionSummary": { "content": "2~4문장", "keywords": ["", "", ""] }
  }
}

[규칙]
- 반드시 JSON만 출력한다(설명/문장/코드펜스 금지).
- keywords.needs / keywords.region은 각각 3개.
- content는 초등학생도 이해할 만큼 쉬운 문장으로 쓰되, 사업계획서 톤을 유지한다.
- 텍스트에서 근거를 찾기 어려우면, 일반적으로 타당한 내용으로 작성하되 과장하지 않는다.

[텍스트]
${baseText.substring(0, 15000)}
`;

        const parsed = await geminiJson(
          prompt,
          "당신은 지역아동센터 사업계획서(연간) 작성 전문가이다. 출력은 JSON만 반환한다.",
        );

        // 6) 파싱 실패 시 fallback (키워드만)
        if (!parsed || typeof parsed !== "object") {
          return res.json({
            ok: true,
            source: "stub-parse-failed",
            received: { hasFile, fileName },
            content: "Gemini 응답을 JSON으로 해석하지 못해 키워드만 제공한다.",
            keywords: { needs: needsKeywords, region: regionKeywords },
            fields: {
              needsProblem: { content: "", keywords: needsKeywords },
              regionSummary: { content: "", keywords: regionKeywords },
            },
          });
        }

        // 7) 값 정리/보정(누락 대비)
        const pNeedsKw: string[] = Array.isArray(
          (parsed as any)?.keywords?.needs,
        )
          ? (parsed as any).keywords.needs
          : [];
        const pRegionKw: string[] = Array.isArray(
          (parsed as any)?.keywords?.region,
        )
          ? (parsed as any).keywords.region
          : [];

        const finalNeedsKw =
          pNeedsKw.filter(Boolean).slice(0, 3).length === 3
            ? pNeedsKw.filter(Boolean).slice(0, 3)
            : needsKeywords;

        const finalRegionKw =
          pRegionKw.filter(Boolean).slice(0, 3).length === 3
            ? pRegionKw.filter(Boolean).slice(0, 3)
            : regionKeywords;

        const needsContent = String(
          (parsed as any)?.fields?.needsProblem?.content || "",
        ).trim();

        const regionContent = String(
          (parsed as any)?.fields?.regionSummary?.content || "",
        ).trim();

        return res.json({
          ok: true,
          source: "gemini",
          received: { hasFile, fileName },
          content:
            "업로드 PDF를 기준으로 '이용아동의 욕구 및 문제점'과 '지역 환경적 특성' 초안을 생성한다.",
          keywords: { needs: finalNeedsKw, region: finalRegionKw },
          fields: {
            needsProblem: { content: needsContent, keywords: finalNeedsKw },
            regionSummary: { content: regionContent, keywords: finalRegionKw },
          },
        });
      } catch (error: any) {
        console.error("necessity autofill error:", error);

        // 키가 없을 때 메시지 명확히
        if (String(error?.message || "").includes("GEMINI_API_KEY")) {
          return res.status(500).json({
            ok: false,
            error: "Server config error",
            message: error.message,
          });
        }

        return res.status(500).json({ ok: false, error: "autofill_failed" });
      }
    },
  );

  /** 2) 자동 분류 (Gemini) */
  app.post("/api/classify", async (req: Request, res: Response) => {
    try {
      const validation = classifyRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validation.error.flatten(),
        });
      }

      const { fileId } = validation.data;
      const file = await storage.getUploadedFile(fileId);

      if (!file || !file.extractedText) {
        return res
          .status(404)
          .json({ error: "File not found or no text extracted" });
      }

      const prompt = `다음은 지역아동센터 프로그램 평가서 PDF에서 추출한 텍스트입니다.
이 텍스트에서 "사업내용 및 수행인력" 표를 최우선으로 분석하고, 프로그램 정보를 추출하여 "JSON 배열"로 반환해주세요.

각 프로그램 객체는 다음 필드를 포함합니다:
- programName: 프로그램명
- category: 대분류 (보호, 교육, 문화, 정서지원, 지역연계 중 하나)
- subCategory: 중분류 (보호>생활/안전, 교육>학습/특기적성, 문화>체험/활동, 정서지원>상담/프로그램, 지역연계>연계/협력)
- targetChildren: 대상 (아동 대상 설명)
- executionDate: 실행일자 (YYYY-MM-DD 형식, 또는 "매주 화요일" 등 텍스트)
- executionMonth: 실행월 (1~12 숫자, 실행일자에서 월을 추출)
- personnel: 수행인력 (담당자명)
- serviceContent: 사업내용/서비스활동 (상세 내용)
- startDate: 시작날짜 (YYYY-MM-DD 형식)
- endDate: 종료날짜 (YYYY-MM-DD 형식)
- participantCount: 참여 인원수 (숫자)
- sessions: 회기수 (숫자)
- plan: 계획 내용
- goal: 목표
- purpose: 목적 (사업내용을 바탕으로 자동 생성)
- expectedEffect: 기대효과

분류 규칙:
1) 대분류 > 중분류 계층 구조를 유지 (보호>생활, 교육>학습 등)
2) 실행일자에서 월(executionMonth)을 자동 추출
3) "사업내용 및 수행인력" 표의 각 행을 독립된 프로그램으로 인식
4) purpose는 serviceContent를 바탕으로 목적 문장 자동 생성

반드시 아래 규칙을 지켜주세요:
1) 설명 문장 금지
2) JSON만 출력
3) 배열 최상위 형식: [ { ... }, { ... } ]

텍스트:
${file.extractedText.substring(0, 15000)}
`;

      const parsed = await geminiJson(
        prompt,
        "당신은 지역아동센터 프로그램 평가서에서 정보를 추출하는 전문가입니다. 출력은 JSON만 반환합니다.",
      );

      let programs: ProgramInfo[] = [];

      try {
        const arr = Array.isArray(parsed) ? parsed : [];
        programs = arr.map((p: any, index: number) => {
          let executionMonth = parseInt(p?.executionMonth, 10) || 0;

          if (!executionMonth && p?.executionDate) {
            const dateMatch = String(p.executionDate).match(/(\d{1,2})월/);
            if (dateMatch) {
              executionMonth = parseInt(dateMatch[1], 10);
            } else {
              const isoMatch = String(p.executionDate).match(/\d{4}-(\d{2})/);
              if (isoMatch) executionMonth = parseInt(isoMatch[1], 10);
            }
          }
          if (!executionMonth && p?.startDate) {
            const isoMatch = String(p.startDate).match(/\d{4}-(\d{2})/);
            if (isoMatch) executionMonth = parseInt(isoMatch[1], 10);
          }

          return {
            id: `program-${randomUUID()}`,
            programName: p?.programName || `프로그램 ${index + 1}`,
            category: validateCategory(String(p?.category || "")),
            subCategory: String(p?.subCategory || "기타"),
            startDate: String(
              p?.startDate || new Date().toISOString().split("T")[0],
            ),
            endDate: String(
              p?.endDate || new Date().toISOString().split("T")[0],
            ),
            targetChildren: String(p?.targetChildren || "아동"),
            participantCount: parseInt(p?.participantCount, 10) || 10,
            sessions: parseInt(p?.sessions, 10) || 1,
            plan: String(p?.plan || ""),
            goal: String(p?.goal || ""),
            purpose: String(p?.purpose || ""),
            expectedEffect: String(p?.expectedEffect || ""),
            executionDate: String(p?.executionDate || ""),
            executionMonth: executionMonth || undefined,
            personnel: String(p?.personnel || ""),
            serviceContent: String(p?.serviceContent || p?.plan || ""),
          };
        });
      } catch (parseError) {
        console.error("Program mapping error:", parseError);
        programs = [];
      }

      if (programs.length === 0) {
        programs = [createDefaultProgram()];
      }

      return res.json(programs);
    } catch (error: any) {
      console.error("Classification error:", error);
      if (String(error?.message || "").includes("GEMINI_API_KEY")) {
        return res
          .status(500)
          .json({ error: "Server config error", message: error.message });
      }
      return res.status(500).json({ error: "Failed to classify content" });
    }
  });

  /** 3) 연간계획서 AI 생성 (Gemini) */
  app.post("/api/generate", async (req: Request, res: Response) => {
    try {
      const validation = generateRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validation.error.flatten(),
          hint: "programs가 비어 있으면 생성이 불가합니다. 먼저 /api/classify로 programs를 확보한 뒤 전달해주세요.",
        });
      }

      const { sectionId, field, context, programs } = validation.data;

      if (!Array.isArray(programs) || programs.length === 0) {
        return res.status(400).json({
          error: "Invalid request",
          details: { programs: ["Required"] },
          hint: "programs가 비어 있습니다. 분류 단계에서 programs를 확보한 뒤 /api/generate에 전달하세요.",
        });
      }

      let prompt = "";
      if (field === "necessity") {
        prompt = `지역아동센터 연간사업계획서의 "사업의 필요성" 섹션을 작성해주세요.

다음 프로그램들의 정보를 바탕으로 작성하세요:
${JSON.stringify(programs, null, 2)}

요구사항:
- 이용아동의 욕구 및 지역적 특성을 포함한다.
- 2~3개 문단으로 작성한다.
- 지역사회의 여건과 아동들의 필요를 구체적으로 언급한다.`;
      } else if (field === "overallEvaluation") {
        prompt = `지역아동센터 연간사업계획서의 "총평" 섹션을 작성해주세요.

다음 프로그램들의 정보를 바탕으로 작성하세요:
${JSON.stringify(programs, null, 2)}

요구사항:
- 전년도 운영 성과와 향후 계획을 포함한다.
- 2~3개 문단으로 작성한다.
- 프로그램 운영 성과와 제공 서비스에 대해 종합적으로 평가한다.`;
      } else if (field === "problems") {
        prompt = `지역아동센터 연간사업계획서의 "${context}" 부분(문제점)을 작성해주세요.

섹션 ID: ${sectionId}
다음 프로그램들의 정보를 바탕으로:
${JSON.stringify(programs, null, 2)}

요구사항:
- 문제점을 2~3개 문장으로 구체적으로 작성한다.
- 예: 참여율, 자원 부족, 운영상의 어려움 등`;
      } else if (field === "improvements") {
        prompt = `지역아동센터 연간사업계획서의 "${context}" 부분(개선계획/환류)을 작성해주세요.

섹션 ID: ${sectionId}
다음 프로그램들의 정보를 바탕으로:
${JSON.stringify(programs, null, 2)}

요구사항:
- 개선계획(환류)을 2~3개 문장으로 구체적으로 작성한다.
- 실행 가능하고 구체적인 개선 방안을 제시한다.`;
      } else {
        return res
          .status(400)
          .json({ error: "Invalid request", message: "Unknown field" });
      }

      const content = await geminiText(
        prompt,
        "당신은 지역아동센터 사업계획서 작성 전문가입니다. 전문적이고 구체적인 내용으로 작성합니다.",
      );

      return res.json({ content });
    } catch (error: any) {
      console.error("Generate error:", error);
      if (String(error?.message || "").includes("GEMINI_API_KEY")) {
        return res
          .status(500)
          .json({ error: "Server config error", message: error.message });
      }
      return res.status(500).json({ error: "Failed to generate content" });
    }
  });

  /** 4) 월간계획서 생성 (Gemini) */
  app.post("/api/generate-monthly", async (req: Request, res: Response) => {
    try {
      const validation = generateMonthlyRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validation.error.flatten(),
        });
      }

      const { plan, programs } = validation.data;

      if (!Array.isArray(programs) || programs.length === 0) {
        return res.status(400).json({
          error: "Invalid request",
          details: { programs: ["Required"] },
          hint: "programs가 비어 있습니다. 분류 결과를 programs로 전달하세요.",
        });
      }

      const prompt = `지역아동센터 ${plan.year}년 ${plan.month}월 사업계획서의 사업목표를 작성해주세요.

다음 프로그램들의 정보를 바탕으로:
${JSON.stringify(programs, null, 2)}

요구사항:
- 월간 사업목표를 2~3개 항목으로 작성한다.
- 예시 형식처럼 하이픈(-) 목록으로 작성한다.
예시:
- 지역아동센터 5대사업을 성실히 수행하며 이용아동에게 질 높은 서비스를 제공한다.
- 아동 안전교육을 통해 긴급한 상황 발생시 아동의 안전을 향상시킨다.`;

      const objectives = await geminiText(
        prompt,
        "당신은 지역아동센터 월간사업계획서 작성 전문가입니다.",
      );

      const updatedPlan = { ...plan, objectives };
      return res.json(updatedPlan);
    } catch (error: any) {
      console.error("Generate monthly error:", error);
      if (String(error?.message || "").includes("GEMINI_API_KEY")) {
        return res
          .status(500)
          .json({ error: "Server config error", message: error.message });
      }
      return res.status(500).json({ error: "Failed to generate monthly plan" });
    }
  });

  return httpServer;
}

/* =========================================================
   Helpers
========================================================= */
function validateCategory(category: string): ProgramCategory {
  const validCategories: ProgramCategory[] = [
    "보호",
    "교육",
    "문화",
    "정서지원",
    "지역연계",
  ];
  if (validCategories.includes(category as ProgramCategory)) {
    return category as ProgramCategory;
  }
  return "교육";
}

function createDefaultProgram(): ProgramInfo {
  return {
    id: `program-${randomUUID()}`,
    programName: "창의력 쑥쑥 미술교실",
    category: "교육",
    subCategory: "특기적성",
    startDate: "2024-03-01",
    endDate: "2024-05-30",
    targetChildren: "초등 1~3학년",
    participantCount: 10,
    sessions: 12,
    plan: "다양한 미술 활동을 통해 창의성을 발현하고 정서적 안정감을 함양",
    goal: "아동들이 미술 활동을 통해 창의력을 발현하고 정서적 안정감을 찾도록 지원",
    purpose: "아동들의 창의성과 정서적 건강 증진",
    expectedEffect: "창의적 사고 향상, 정서 표현 능력 증가",
  };
}
