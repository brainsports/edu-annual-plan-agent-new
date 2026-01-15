import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { createRequire } from "module";
import OpenAI from "openai";
import { randomUUID } from "crypto";
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

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

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

  app.post("/api/classify", async (req: Request, res: Response) => {
    try {
      const validation = classifyRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.flatten() });
      }
      const { fileId } = validation.data;
      const file = await storage.getUploadedFile(fileId);

      if (!file || !file.extractedText) {
        return res.status(404).json({ error: "File not found or no text extracted" });
      }

      const prompt = `다음은 지역아동센터 프로그램 평가서 PDF에서 추출한 텍스트입니다. 이 텍스트에서 프로그램 정보를 추출하여 JSON 배열로 반환해주세요.

각 프로그램에 대해 다음 정보를 추출해주세요:
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

텍스트:
${file.extractedText.substring(0, 15000)}

JSON 배열 형식으로만 응답해주세요. 설명 없이 JSON만 반환하세요.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: "당신은 지역아동센터 프로그램 평가서에서 정보를 추출하는 전문가입니다. JSON 형식으로만 응답합니다.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_completion_tokens: 4096,
      });

      const content = response.choices[0]?.message?.content || "[]";
      
      let programs: ProgramInfo[] = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          programs = parsed.map((p: any, index: number) => ({
            id: `program-${randomUUID()}`,
            programName: p.programName || `프로그램 ${index + 1}`,
            category: validateCategory(p.category),
            subCategory: p.subCategory || "기타",
            startDate: p.startDate || new Date().toISOString().split("T")[0],
            endDate: p.endDate || new Date().toISOString().split("T")[0],
            targetChildren: p.targetChildren || "아동",
            participantCount: parseInt(p.participantCount) || 10,
            sessions: parseInt(p.sessions) || 1,
            plan: p.plan || "",
            goal: p.goal || "",
            purpose: p.purpose || "",
            expectedEffect: p.expectedEffect || "",
          }));
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        programs = [createDefaultProgram()];
      }

      if (programs.length === 0) {
        programs = [createDefaultProgram()];
      }

      res.json(programs);
    } catch (error) {
      console.error("Classification error:", error);
      res.status(500).json({ error: "Failed to classify content" });
    }
  });

  app.post("/api/generate", async (req: Request, res: Response) => {
    try {
      const validation = generateRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.flatten() });
      }
      const { sectionId, field, context, programs } = validation.data;

      let prompt = "";
      if (field === "necessity") {
        prompt = `지역아동센터 연간사업계획서의 "사업의 필요성" 섹션을 작성해주세요.

다음 프로그램들의 정보를 바탕으로 작성하세요:
${JSON.stringify(programs, null, 2)}

이용아동의 욕구 및 지역적 특성을 포함하여 2-3개 문단으로 작성해주세요.
지역사회의 경제적, 문화적 여건과 아동들의 필요를 구체적으로 언급해주세요.`;
      } else if (field === "overallEvaluation") {
        prompt = `지역아동센터 연간사업계획서의 "총평" 섹션을 작성해주세요.

다음 프로그램들의 정보를 바탕으로 작성하세요:
${JSON.stringify(programs, null, 2)}

전년도 운영 성과와 향후 계획을 포함하여 2-3개 문단으로 작성해주세요.
종사자들의 노력, 프로그램 운영 성과, 아동들에게 제공한 서비스에 대해 종합적으로 평가해주세요.`;
      } else if (field === "problems") {
        prompt = `지역아동센터 연간사업계획서의 "${context}" 부분을 작성해주세요.

섹션 ID: ${sectionId}
다음 프로그램들의 정보를 바탕으로:
${JSON.stringify(programs, null, 2)}

해당 분류의 프로그램 운영 시 발생한 문제점을 2-3개 문장으로 구체적으로 작성해주세요.
예: 프로그램 참여율, 자원 부족, 운영상의 어려움 등`;
      } else if (field === "improvements") {
        prompt = `지역아동센터 연간사업계획서의 "${context}" 부분을 작성해주세요.

섹션 ID: ${sectionId}
다음 프로그램들의 정보를 바탕으로:
${JSON.stringify(programs, null, 2)}

해당 문제점에 대한 개선계획(환류)을 2-3개 문장으로 구체적으로 작성해주세요.
실행 가능하고 구체적인 개선 방안을 제시해주세요.`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: "당신은 지역아동센터 사업계획서 작성 전문가입니다. 전문적이고 구체적인 내용으로 작성합니다.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_completion_tokens: 2048,
      });

      const content = response.choices[0]?.message?.content || "";
      res.json({ content });
    } catch (error) {
      console.error("Generate error:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });

  app.post("/api/generate-monthly", async (req: Request, res: Response) => {
    try {
      const validation = generateMonthlyRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.flatten() });
      }
      const { plan, programs } = validation.data;

      const prompt = `지역아동센터 ${plan.year}년 ${plan.month}월 사업계획서의 사업목표를 작성해주세요.

다음 프로그램들의 정보를 바탕으로:
${JSON.stringify(programs, null, 2)}

월간 사업목표를 2-3개 항목으로 작성해주세요.
예시 형식:
- 지역아동센터 5대사업을 성실히 수행하며 이용아동에게 질 높은 서비스를 제공한다.
- 아동 안전교육을 통해 긴급한 상황 발생시 아동의 안전을 향상시킨다.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: "당신은 지역아동센터 월간사업계획서 작성 전문가입니다.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_completion_tokens: 1024,
      });

      const objectives = response.choices[0]?.message?.content || "";

      const updatedPlan = {
        ...plan,
        objectives,
      };

      res.json(updatedPlan);
    } catch (error) {
      console.error("Generate monthly error:", error);
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
