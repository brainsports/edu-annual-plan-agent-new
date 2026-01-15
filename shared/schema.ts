import { z } from "zod";

export const programCategorySchema = z.enum([
  "보호",
  "교육", 
  "문화",
  "정서지원",
  "지역연계"
]);

export const programSubCategorySchema = z.object({
  보호: z.enum(["생활", "안전"]).optional(),
  교육: z.enum(["성장과권리", "학습", "특기적성"]).optional(),
  문화: z.enum(["체험활동"]).optional(),
  정서지원: z.enum(["상담"]).optional(),
  지역연계: z.enum(["연계"]).optional(),
});

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

export const annualPlanSectionSchema = z.object({
  id: z.string(),
  category: programCategorySchema,
  subCategory: z.string(),
  problems: z.string(),
  improvements: z.string(),
});

export const annualPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  necessity: z.string(),
  localCharacteristics: z.string(),
  sections: z.array(annualPlanSectionSchema),
  overallEvaluation: z.string(),
  createdAt: z.string(),
});

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
  weeklyTasks: z.array(z.object({
    week: z.number(),
    tasks: z.array(z.string()),
  })),
  dailySchedule: z.array(z.object({
    time: z.string(),
    mon: z.string(),
    tue: z.string(),
    wed: z.string(),
    thu: z.string(),
    fri: z.string(),
    sat: z.string(),
  })),
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
});

export const projectStateSchema = z.object({
  currentStep: z.number().min(1).max(5),
  uploadedFiles: z.array(uploadedFileSchema),
  extractedPrograms: z.array(programInfoSchema),
  annualPlan: annualPlanSchema.optional(),
  monthlyPlans: z.array(monthlyPlanSchema),
});

export type ProgramCategory = z.infer<typeof programCategorySchema>;
export type ProgramInfo = z.infer<typeof programInfoSchema>;
export type AnnualPlanSection = z.infer<typeof annualPlanSectionSchema>;
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
