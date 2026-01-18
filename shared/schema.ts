import { z } from "zod";

/* =========================
   공통: 프로그램 분류
========================= */

export const programCategorySchema = z.enum([
  "보호",
  "교육",
  "문화",
  "정서지원",
  "지역연계",
]);

/* 중분류 체계 (대분류별 하위 분류) */
export const subCategoryMap: Record<string, string[]> = {
  보호: ["생활", "안전"],
  교육: ["학습", "특기적성"],
  문화: ["체험", "활동"],
  정서지원: ["상담", "프로그램"],
  지역연계: ["연계", "협력"],
};

export const programInfoSchema = z.object({
  id: z.string(),
  programName: z.string(),
  category: programCategorySchema,
  subCategory: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  targetChildren: z.string(),
  participantCount: z.number(),
  sessions: z.number(),
  plan: z.string(),
  goal: z.string(),

  // 사업내용 및 수행인력 필드 (마스터 데이터)
  executionDate: z.string().optional(),     // 실행일자
  executionMonth: z.number().optional(),    // 자동 분류된 월 (1-12)
  personnel: z.string().optional(),         // 수행인력
  serviceContent: z.string().optional(),    // 사업내용(서비스활동)

  // 선택(있어도 되고 없어도 됨)
  purpose: z.string().optional(),
  expectedEffect: z.string().optional(),
  evaluationMethod: z.string().optional(),
  contentEvaluation: z.string().optional(),
  operationEvaluation: z.string().optional(),
  satisfactionEvaluation: z.string().optional(),
  futurePlan: z.string().optional(),
  supervisorOpinion: z.string().optional(),
  managerOpinion: z.string().optional(),
});

/* =========================
   연간계획: PART 공통 필드(키워드/요청/내용)
   - PART1 화면에서 이미 이 구조를 쓰고 있어요.
========================= */

export const draftFieldSchema = z.object({
  keyword: z.string(),
  request: z.string(),
  content: z.string(),
});

/**
 * PART1 / PART2 는 "필드명이 고정"일 수도 있지만
 * 지금처럼 계속 늘어날 가능성이 높으니
 * 가장 안전하게 record(키:필드명) 구조로 둡니다.
 */
export const annualPartSchema = z.record(draftFieldSchema);

/* =========================
   연간계획(새 구조)
   - annualPlan.part1 / part2 / firstHalf / secondHalf 로 확장 가능
========================= */

export const annualPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),

  part1: annualPartSchema.optional(),
  part2: annualPartSchema.optional(),

  // 상/하반기는 나중에 월간/표 구조로 바뀔 수 있어 일단 유연하게
  firstHalf: z.any().optional(),
  secondHalf: z.any().optional(),
});

/* =========================
   월간계획(기존 유지)
========================= */

export const monthlyPlanItemSchema = z.object({
  id: z.string(),
  category: programCategorySchema,
  subCategory: z.string(),
  programName: z.string(),
  participants: z.string(),
  staff: z.string(),
  content: z.string(),
});

export const monthlyPlanSchema = z.object({
  id: z.string(),
  month: z.number(),
  year: z.number(),
  objectives: z.string(),
  weeklyTasks: z.array(
    z.object({
      week: z.number(),
      tasks: z.array(z.string()),
    })
  ),
  dailySchedule: z.array(
    z.object({
      time: z.string(),
      mon: z.string(),
      tue: z.string(),
      wed: z.string(),
      thu: z.string(),
      fri: z.string(),
      sat: z.string(),
    })
  ),
  items: z.array(monthlyPlanItemSchema),
  budget: z.object({
    income: z.array(z.object({ item: z.string(), amount: z.number() })),
    expense: z.array(z.object({ item: z.string(), amount: z.number() })),
  }),
  createdAt: z.string(),
});

export const uploadedFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["evaluation", "annual_template", "monthly_template"]),
  extractedText: z.string().optional(),
  uploadedAt: z.string(),
  size: z.number().optional(),
  status: z.enum(["pending", "success", "error"]).optional(),
});

/* =========================
   프로젝트 상태
========================= */

export const projectStateSchema = z.object({
  currentStep: z.number().min(1).max(7),
  uploadedFiles: z.array(uploadedFileSchema),
  extractedPrograms: z.array(programInfoSchema),
  annualPlan: annualPlanSchema.optional(),
  monthlyPlans: z.array(monthlyPlanSchema),
  classificationStatus: z.enum(["idle", "processing", "complete", "error"]).optional(),
});

/* =========================
   Types
========================= */

export type ProgramCategory = z.infer<typeof programCategorySchema>;
export type ProgramInfo = z.infer<typeof programInfoSchema>;

export type DraftField = z.infer<typeof draftFieldSchema>;
export type AnnualPart = z.infer<typeof annualPartSchema>;
export type AnnualPlan = z.infer<typeof annualPlanSchema>;

export type MonthlyPlanItem = z.infer<typeof monthlyPlanItemSchema>;
export type MonthlyPlan = z.infer<typeof monthlyPlanSchema>;

export type UploadedFile = z.infer<typeof uploadedFileSchema>;
export type ProjectState = z.infer<typeof projectStateSchema>;

export const insertProgramInfoSchema = programInfoSchema.omit({ id: true });
export type InsertProgramInfo = z.infer<typeof insertProgramInfoSchema>;

export const users = {
  id: "",
  username: "",
  password: "",
};

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };

export const classifyRequestSchema = z.object({
  fileId: z.string(),
});

export const generateRequestSchema = z.object({
  sectionId: z.string().optional(),
  field: z.string(),
  context: z.string(),
  programs: z.array(programInfoSchema),
});

export const generateMonthlyRequestSchema = z.object({
  plan: monthlyPlanSchema,
  programs: z.array(programInfoSchema),
});

export type ClassifyRequest = z.infer<typeof classifyRequestSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GenerateMonthlyRequest = z.infer<typeof generateMonthlyRequestSchema>;
