import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ProjectState,
  UploadedFile,
  ProgramInfo,
  AnnualPlan,
  MonthlyPlan,
  AnnualPlanSection,
  ProgramCategory,
} from "@shared/schema";

interface AppState extends ProjectState {
  setCurrentStep: (step: number) => void;
  addUploadedFile: (file: UploadedFile) => void;
  removeUploadedFile: (fileId: string) => void;
  setExtractedPrograms: (programs: ProgramInfo[]) => void;
  updateProgram: (program: ProgramInfo) => void;
  setAnnualPlan: (plan: AnnualPlan) => void;
  updateAnnualPlanSection: (section: AnnualPlanSection) => void;
  updateAnnualPlanField: (field: keyof AnnualPlan, value: string) => void;
  addMonthlyPlan: (plan: MonthlyPlan) => void;
  updateMonthlyPlan: (plan: MonthlyPlan) => void;
  reset: () => void;
}

const initialState: ProjectState = {
  currentStep: 1,
  uploadedFiles: [],
  extractedPrograms: [],
  annualPlan: undefined,
  monthlyPlans: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),

      addUploadedFile: (file) =>
        set((state) => ({
          uploadedFiles: [...state.uploadedFiles, file],
        })),

      removeUploadedFile: (fileId) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.filter((f) => f.id !== fileId),
        })),

      setExtractedPrograms: (programs) =>
        set({ extractedPrograms: programs }),

      updateProgram: (program) =>
        set((state) => ({
          extractedPrograms: state.extractedPrograms.map((p) =>
            p.id === program.id ? program : p
          ),
        })),

      setAnnualPlan: (plan) => set({ annualPlan: plan }),

      updateAnnualPlanSection: (section) =>
        set((state) => ({
          annualPlan: state.annualPlan
            ? {
                ...state.annualPlan,
                sections: state.annualPlan.sections.map((s) =>
                  s.id === section.id ? section : s
                ),
              }
            : undefined,
        })),

      updateAnnualPlanField: (field, value) =>
        set((state) => ({
          annualPlan: state.annualPlan
            ? { ...state.annualPlan, [field]: value }
            : undefined,
        })),

      addMonthlyPlan: (plan) =>
        set((state) => ({
          monthlyPlans: [...state.monthlyPlans, plan],
        })),

      updateMonthlyPlan: (plan) =>
        set((state) => ({
          monthlyPlans: state.monthlyPlans.map((p) =>
            p.id === plan.id ? plan : p
          ),
        })),

      reset: () => set(initialState),
    }),
    {
      name: "annual-program-assistant-storage",
    }
  )
);

export function createInitialAnnualPlan(programs: ProgramInfo[]): AnnualPlan {
  const categories: ProgramCategory[] = ["보호", "교육", "문화", "정서지원", "지역연계"];
  const subCategories: Record<ProgramCategory, string[]> = {
    보호: ["생활", "안전"],
    교육: ["성장과권리", "학습", "특기적성"],
    문화: ["체험활동"],
    정서지원: ["상담"],
    지역연계: ["연계"],
  };

  const sections: AnnualPlanSection[] = [];

  categories.forEach((category) => {
    subCategories[category].forEach((subCategory) => {
      const relatedPrograms = programs.filter(
        (p) => p.category === category && p.subCategory === subCategory
      );

      if (relatedPrograms.length > 0) {
        sections.push({
          id: `section-${category}-${subCategory}`,
          category,
          subCategory,
          problems: "",
          improvements: "",
        });
      }
    });
  });

  if (sections.length === 0) {
    categories.forEach((category) => {
      sections.push({
        id: `section-${category}-default`,
        category,
        subCategory: subCategories[category][0],
        problems: "",
        improvements: "",
      });
    });
  }

  return {
    id: `annual-${Date.now()}`,
    title: `${new Date().getFullYear()}년 연간사업계획`,
    necessity: "",
    localCharacteristics: "",
    sections,
    overallEvaluation: "",
    createdAt: new Date().toISOString(),
  };
}

export function createInitialMonthlyPlan(
  year: number,
  month: number,
  programs: ProgramInfo[]
): MonthlyPlan {
  const items = programs.map((p) => ({
    id: `monthly-item-${p.id}`,
    category: p.category,
    subCategory: p.subCategory,
    programName: p.programName,
    participants: p.targetChildren,
    staff: "",
    content: p.plan || "",
  }));

  return {
    id: `monthly-${year}-${month}`,
    month,
    year,
    objectives: "",
    weeklyTasks: [
      { week: 1, tasks: [] },
      { week: 2, tasks: [] },
      { week: 3, tasks: [] },
      { week: 4, tasks: [] },
    ],
    dailySchedule: [],
    items,
    budget: {
      income: [],
      expense: [],
    },
    createdAt: new Date().toISOString(),
  };
}
