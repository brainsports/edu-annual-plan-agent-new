import { useMemo } from "react";
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
  pathname?: string;
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
    <nav className="flex flex-col gap-1 py-3 xl:py-4 px-2 xl:px-3">
      {STEP_FLOW.map((step, index) => {
        const isCompleted = activeNumber > step.number;
        const isCurrent = activeNumber === step.number;
        const isClickable = !!onStepClick && step.number <= activeNumber;

        return (
          <div key={step.key} className="flex flex-col">
            <button
              onClick={() => isClickable && onStepClick?.(step.number)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-2 xl:gap-3 px-2 xl:px-3 py-2 xl:py-2.5 rounded-lg transition-all duration-200 text-left w-full",
                isCurrent && "bg-primary text-primary-foreground",
                isCompleted && !isCurrent && "text-foreground hover-elevate",
                !isCompleted && !isCurrent && "text-muted-foreground",
                isClickable && !isCurrent && "cursor-pointer",
                !isClickable && "cursor-default"
              )}
              data-testid={`step-${step.number}`}
            >
              <div
                className={cn(
                  "w-6 h-6 xl:w-7 xl:h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border-2",
                  isCurrent && "bg-white text-primary border-white",
                  isCompleted && !isCurrent && "bg-primary/15 text-primary border-primary/30",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground border-muted"
                )}
              >
                {isCompleted ? <Check className="w-3 h-3 xl:w-3.5 xl:h-3.5" /> : step.number}
              </div>

              <span
                className={cn(
                  "text-xs xl:text-sm font-medium truncate",
                  isCurrent && "text-primary-foreground",
                  isCompleted && !isCurrent && "text-foreground",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </button>

            {index < STEP_FLOW.length - 1 && (
              <div className="ml-[18px] xl:ml-[22px] pl-px py-0.5 xl:py-1">
                <div
                  className={cn(
                    "w-0.5 h-3 xl:h-4",
                    activeNumber > step.number ? "bg-primary/40" : "bg-muted"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function getStepLabel(step: number): string {
  const stepDef = STEP_FLOW.find((s) => s.number === step);
  return stepDef?.label || "";
}
