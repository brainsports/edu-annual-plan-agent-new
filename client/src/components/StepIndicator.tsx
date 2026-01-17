import React, { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StepDef = {
  key:
    | "upload"
    | "classify"
    | "annual_part1"
    | "annual_part2"
    | "monthly_first_half"
    | "monthly_second_half"
    | "download";
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label: string;
  path: string;
};

/** ✅ 7단계(업로드/자동분류 포함) = 라우트 1:1 단일 소스 */
const STEP_FLOW: StepDef[] = [
  { key: "upload", number: 1, label: "PDF 업로드", path: "/" },
  { key: "classify", number: 2, label: "자동 분류", path: "/classify" },
  {
    key: "annual_part1",
    number: 3,
    label: "연간 Part 1",
    path: "/annual/part1",
  },
  {
    key: "annual_part2",
    number: 4,
    label: "연간 Part 2",
    path: "/annual/part2",
  },
  {
    key: "monthly_first_half",
    number: 5,
    label: "상반기",
    path: "/monthly/first-half",
  },
  {
    key: "monthly_second_half",
    number: 6,
    label: "하반기",
    path: "/monthly/second-half",
  },
  { key: "download", number: 7, label: "다운로드", path: "/download" },
];

function getStepIndexByPath(pathname: string): number {
  if (!pathname) return 0;

  // "/"는 특별 처리(다른 경로도 "/"로 시작하므로)
  if (pathname === "/") return 0;

  const exactIdx = STEP_FLOW.findIndex((s) => s.path === pathname);
  if (exactIdx >= 0) return exactIdx;

  const startsIdx = STEP_FLOW.findIndex(
    (s) => s.path !== "/" && pathname.startsWith(s.path),
  );
  if (startsIdx >= 0) return startsIdx;

  return 0;
}

interface StepIndicatorProps {
  /** ✅ 권장: useLocation()의 location을 그대로 전달 */
  pathname?: string;

  /** 기존 호환: 숫자 step */
  currentStep?: number;

  onStepClick?: (step: number) => void;
}

export function StepIndicator({
  pathname,
  currentStep,
  onStepClick,
}: StepIndicatorProps) {
  const currentIndex = useMemo(() => {
    if (pathname) return getStepIndexByPath(pathname);

    if (typeof currentStep === "number") {
      const idx = STEP_FLOW.findIndex((s) => s.number === currentStep);
      return idx >= 0 ? idx : 0;
    }

    return 0;
  }, [pathname, currentStep]);

  const activeNumber = STEP_FLOW[currentIndex]?.number ?? 1;

  return (
    <div className="w-full py-3">
      {/* ✅ 7단계는 가로가 길어지므로 overflow-x-auto로 안전하게 */}
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4 overflow-x-auto">
        {STEP_FLOW.map((step, index) => {
          const isCompleted = activeNumber > step.number;
          const isCurrent = activeNumber === step.number;

          // 기존 정책 유지: 현재 단계 이하만 클릭 가능
          const isClickable = !!onStepClick && step.number <= activeNumber;

          return (
            <div
              key={step.key}
              className="flex items-center flex-1 min-w-[110px]"
            >
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable && onStepClick?.(step.number)}
                  disabled={!isClickable}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent &&
                      "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isCompleted &&
                      !isCurrent &&
                      "bg-muted text-muted-foreground",
                    isClickable && "cursor-pointer hover-elevate",
                  )}
                  data-testid={`step-${step.number}`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : step.number}
                </button>

                <span
                  className={cn(
                    "mt-2 text-xs font-medium whitespace-nowrap text-center",
                    isCompleted || isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < STEP_FLOW.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    activeNumber > step.number ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
