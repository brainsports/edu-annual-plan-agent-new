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

/** Gemini 클라이언트 */
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in server env");
  }
  return new GoogleGenAI({ apiKey });
}

/** 모델명은 환경변수로 바꿀 수 있게 (기본값 제공) */
function getGeminiModel() {
  return process.env.GEMINI_MODEL || "gemini-1.5-flash";
}

/** Gemini 호출: 텍스트 반환 */
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
    // 응답을 길게 받도록 여유 있게 설정
    config: {
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  });

  // SDK 응답에서 텍스트 안전하게 추출
  const text =
    (result as any)?.text ??
    (result as any)?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") ??
    "";

  return String(text || "");
}

/** Gemini 호출: JSON(배열/객체) 파싱 */
async function geminiJson(prompt: string, system?: string) {
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
      // JSON만 오도록 힌트 (모델이 지원하면 더 잘 지킵니다)
      responseMimeType: "application/json",
    },
  });

  const text =
    (result as any)?.text ??
    (result as any)?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") ??
    "";

  const raw = String(text || "").trim();

  // 1) 바로 JSON 파싱 시도
  try {
    return JSON.parse(raw);
  } catch {
    // 2) 코드펜스/설명 섞인 경우 JSON 부분만 추출
    const jsonMatch =
      raw.match(/\[[\s\S]*\]/) || // 배열 우선
      raw.match(/\{[\s\S]*\}/);   // 객체

    if (jsonMatch?.[0]) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // fallthrough
      }
    }
  }

  // 실패하면 빈 배열
  return [];
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  /** 1) 업로드 */
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const pdfData = await pdfParse(file.buffer);
      const extractedText = pdfData.text;

      const uploadedFile: UploadedFile = {
        id: randomUUID(),
        name: file.originalname,
        type: "evaluation",
        extractedText,
        uploadedAt: new Date().toISOString(),
      };

      await storage.addUploadedFile(uploadedFile);
      res.json(uploadedFile);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });

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
        return res.status(404).json({ error: "File not found or no text extracted" });
      }

      const prompt = `다음은 지역아동센터 프로그램 평가서 PDF에서 추출한 텍스트입니다.
이 텍스트에서 프로그램 정보를 추출하여 "JSON 배열"로만 반환해주세요.

각 프로그램 객체는 다음 필드를 포함합니다:
- programName: 프로그램명
- category: 대분류 (보호, 교육, 문화, 정서지원, 지역연계 중 하나)
- subCategory: 중분류 (보호>생활/안전, 교육>성장과권리/학습/특기적성, 문화>체험활동, 정서지원>상담, 지역연계>연계)
- startDate: 시작날짜 (YYYY-MM-DD 형식)
- endDate: 종료날짜 (YYYY-MM-DD 형식)
- targetChildren: 대상아동 설명
- participantCount: 참여 인원수 (숫자)
- sessions: 회기수 (숫자)
- plan: 계획 내용
- goal: 목표
- purpose: 목적 (있는 경우)
- expectedEffect: 기대효과 (있는 경우)

반드시 아래 규칙을 지켜주세요:
1) 설명 문장 금지
2) JSON만 출력
3) 배열 최상위 형식: [ { ... }, { ... } ]

텍스트:
${file.extractedText.substring(0, 15000)}
`;

      const parsed = await geminiJson(
        prompt,
        "당신은 지역아동센터 프로그램 평가서에서 정보를 추출하는 전문가입니다. 출력은 JSON만 반환합니다."
      );

      let programs: ProgramInfo[] = [];

      try {
        const arr = Array.isArray(parsed) ? parsed : [];
        programs = arr.map((p: any, index: number) => ({
          id: `program-${randomUUID()}`,
          programName: p?.programName || `프로그램 ${index + 1}`,
          category: validateCategory(String(p?.category || "")),
          subCategory: String(p?.subCategory || "기타"),
          startDate: String(p?.startDate || new Date().toISOString().split("T")[0]),
          endDate: String(p?.endDate || new Date().toISOString().split("T")[0]),
          targetChildren: String(p?.targetChildren || "아동"),
          participantCount: parseInt(p?.participantCount, 10) || 10,
          sessions: parseInt(p?.sessions, 10) || 1,
          plan: String(p?.plan || ""),
          goal: String(p?.goal || ""),
          purpose: String(p?.purpose || ""),
          expectedEffect: String(p?.expectedEffect || ""),
        }));
      } catch (parseError) {
        console.error("Program mapping error:", parseError);
        programs = [];
      }

      if (programs.length === 0) {
        programs = [createDefaultProgram()];
      }

      res.json(programs);
    } catch (error: any) {
      console.error("Classification error:", error);
      // 키가 없을 때 메시지 명확히
      if (String(error?.message || "").includes("GEMINI_API_KEY")) {
        return res.status(500).json({ error: "Server config error", message: error.message });
      }
      res.status(500).json({ error: "Failed to classify content" });
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
          hint:
            "programs가 비어 있으면 생성이 불가합니다. 먼저 /api/classify로 programs를 확보한 뒤 전달해주세요.",
        });
      }

      const { sectionId, field, context, programs } = validation.data;

      // ✅ 방어: programs가 없거나 비어있는 경우
      if (!Array.isArray(programs) || programs.length === 0) {
        return res.status(400).json({
          error: "Invalid request",
          details: { programs: ["Required"] },
          hint:
            "programs가 비어 있습니다. 분류 단계에서 programs를 확보한 뒤 /api/generate에 전달하세요.",
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
        return res.status(400).json({ error: "Invalid request", message: "Unknown field" });
      }

      const content = await geminiText(
        prompt,
        "당신은 지역아동센터 사업계획서 작성 전문가입니다. 전문적이고 구체적인 내용으로 작성합니다."
      );

      res.json({ content });
    } catch (error: any) {
      console.error("Generate error:", error);
      if (String(error?.message || "").includes("GEMINI_API_KEY")) {
        return res.status(500).json({ error: "Server config error", message: error.message });
      }
      res.status(500).json({ error: "Failed to generate content" });
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

      const objectives = await geminiText(prompt, "당신은 지역아동센터 월간사업계획서 작성 전문가입니다.");

      const updatedPlan = { ...plan, objectives };
      res.json(updatedPlan);
    } catch (error: any) {
      console.error("Generate monthly error:", error);
      if (String(error?.message || "").includes("GEMINI_API_KEY")) {
        return res.status(500).json({ error: "Server config error", message: error.message });
      }
      res.status(500).json({ error: "Failed to generate monthly plan" });
    }
  });

  return httpServer;
}

function validateCategory(category: string): ProgramCategory {
  const validCategories: ProgramCategory[] = ["보호", "교육", "문화", "정서지원", "지역연계"];
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
