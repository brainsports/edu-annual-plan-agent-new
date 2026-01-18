import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ProjectState,
  UploadedFile,
  ProgramInfo,
  AnnualPlan,
  MonthlyPlan,
  DraftField,
} from "@shared/schema";

type AnnualPartKey = "part1" | "part2";

interface AppState extends ProjectState {
  setCurrentStep: (step: number) => void;

  addUploadedFile: (file: UploadedFile) => void;
  removeUploadedFile: (fileId: string) => void;
  setUploadedFiles: (files: UploadedFile[]) => void;
  setClassificationStatus: (status: ProjectState["classificationStatus"]) => void;

  setExtractedPrograms: (programs: ProgramInfo[]) => void;
  updateProgram: (program: ProgramInfo) => void;

  setAnnualPlan: (plan: AnnualPlan) => void;

  /** annualPlan 최상위 필드(예: title, part1, part2 등) 업데이트 */
  updateAnnualPlanField: (
    field: keyof AnnualPlan,
    value: AnnualPlan[keyof AnnualPlan],
  ) => void;

  /**
   * 연간 PART 내부의 특정 필드를 업데이트
   * 예) updateAnnualPartField("part1", "necessity", { ... })
   */
  updateAnnualPartField: (
    part: AnnualPartKey,
    fieldKey: string,
    value: DraftField,
  ) => void;

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
  classificationStatus: "idle",
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

      setUploadedFiles: (files) => set({ uploadedFiles: files }),
      
      setClassificationStatus: (status) => set({ classificationStatus: status }),

      setExtractedPrograms: (programs) => set({ extractedPrograms: programs }),

      updateProgram: (program) =>
        set((state) => ({
          extractedPrograms: state.extractedPrograms.map((p) =>
            p.id === program.id ? program : p,
          ),
        })),

      setAnnualPlan: (plan) => set({ annualPlan: plan }),

      updateAnnualPlanField: (field, value) =>
        set((state) => ({
          annualPlan: state.annualPlan
            ? { ...state.annualPlan, [field]: value }
            : undefined,
        })),

      updateAnnualPartField: (part, fieldKey, value) =>
        set((state) => {
          if (!state.annualPlan) return { annualPlan: undefined };

          const prevPart = (state.annualPlan[part] ?? {}) as Record<
            string,
            DraftField
          >;

          return {
            annualPlan: {
              ...state.annualPlan,
              [part]: {
                ...prevPart,
                [fieldKey]: value,
              },
            },
          };
        }),

      addMonthlyPlan: (plan) =>
        set((state) => ({
          monthlyPlans: [...state.monthlyPlans, plan],
        })),

      updateMonthlyPlan: (plan) =>
        set((state) => ({
          monthlyPlans: state.monthlyPlans.map((p) =>
            p.id === plan.id ? plan : p,
          ),
        })),

      reset: () => set(initialState),
    }),
    { name: "annual-program-assistant-storage" },
  ),
);

/* =========================
   초기 연간계획(새 구조)
========================= */

const emptyDraft = (keyword = ""): DraftField => ({
  keyword,
  request: "",
  content: "",
});

export function createInitialAnnualPlan(_programs: ProgramInfo[]): AnnualPlan {
  const year = new Date().getFullYear();

  return {
    id: `annual-${Date.now()}`,
    title: `${year}년 연간사업계획`,
    createdAt: new Date().toISOString(),

    // PART1 기본 필드(필요시 화면에서 더 추가/수정 가능)
    part1: {
      necessity: emptyDraft("지역의 한계"),
      evaluationAndFeedback: emptyDraft("정서지원, 참여율, 환류"),
      satisfaction: emptyDraft("만족도"),
      // 필요하면 여기 계속 추가 가능
      // localCharacteristics: emptyDraft("지역 특성"),
      // overallEvaluation: emptyDraft("종합 평가"),
    },

    // PART2는 비워두고 시작(화면에서 채움)
    part2: {},
  };
}

/* =========================
   초기 월간계획(기존 유지)
========================= */

export function createInitialMonthlyPlan(
  year: number,
  month: number,
  programs: ProgramInfo[],
): MonthlyPlan {
  // 해당 월에 해당하는 프로그램만 필터링
  const monthPrograms = filterProgramsByMonth(programs, month);

  const items = monthPrograms.map((p) => ({
    id: `monthly-item-${p.id}`,
    category: p.category,
    subCategory: p.subCategory,
    programName: p.programName,
    participants: p.targetChildren,
    staff: p.personnel || "",
    content: p.serviceContent || p.plan || "",
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
    budget: { income: [], expense: [] },
    createdAt: new Date().toISOString(),
  };
}

/* =========================
   프로그램 월별 필터링 및 정렬
========================= */

/**
 * 실행월 기준으로 프로그램 필터링
 */
export function filterProgramsByMonth(
  programs: ProgramInfo[],
  month: number,
): ProgramInfo[] {
  return programs.filter((p) => {
    // executionMonth가 있으면 그것으로 판단
    if (p.executionMonth) {
      return p.executionMonth === month;
    }
    // 없으면 startDate에서 월 추출
    if (p.startDate) {
      const dateMatch = p.startDate.match(/\d{4}-(\d{2})/);
      if (dateMatch) {
        return parseInt(dateMatch[1], 10) === month;
      }
    }
    return false;
  });
}

/**
 * 프로그램을 대분류 > 중분류 > 프로그램명 순으로 정렬
 */
export function sortProgramsByCategory(programs: ProgramInfo[]): ProgramInfo[] {
  const categoryOrder = ["보호", "교육", "문화", "정서지원", "지역연계"];
  
  return [...programs].sort((a, b) => {
    // 1. 대분류 순서
    const catA = categoryOrder.indexOf(a.category);
    const catB = categoryOrder.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    
    // 2. 중분류 이름순
    if (a.subCategory !== b.subCategory) {
      return a.subCategory.localeCompare(b.subCategory, "ko");
    }
    
    // 3. 프로그램명 이름순
    return a.programName.localeCompare(b.programName, "ko");
  });
}
