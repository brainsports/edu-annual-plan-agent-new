import { useState } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StepDef = {
  key: string;
  number: number;
  label: string;
};

const STEP_FLOW: StepDef[] = [
  { key: "upload", number: 1, label: "PDF 업로드" },
  { key: "classify", number: 2, label: "자동 분류" },
  { key: "annual_part1", number: 3, label: "연간 Part 1" },
  { key: "annual_part2", number: 4, label: "연간 Part 2" },
  { key: "monthly_first_half", number: 5, label: "상반기" },
  { key: "monthly_second_half", number: 6, label: "하반기" },
  { key: "download", number: 7, label: "다운로드" },
];

interface MobileStepDrawerProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function MobileStepDrawer({ currentStep, onStepClick }: MobileStepDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentStepDef = STEP_FLOW.find(s => s.number === currentStep) || STEP_FLOW[0];

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border"
        data-testid="mobile-step-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
            {currentStep}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-foreground">
              {currentStepDef.label}
            </span>
            <span className="text-xs text-muted-foreground">
              단계 {currentStep} / 7
            </span>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="bg-sidebar border-b border-sidebar-border px-2 py-2 space-y-1">
          {STEP_FLOW.map((step) => {
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            const isClickable = !!onStepClick && step.number <= currentStep;

            return (
              <button
                key={step.key}
                onClick={() => {
                  if (isClickable) {
                    onStepClick?.(step.number);
                    setIsOpen(false);
                  }
                }}
                disabled={!isClickable}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left transition-colors",
                  isCurrent && "bg-primary text-primary-foreground",
                  isCompleted && !isCurrent && "text-foreground hover:bg-muted",
                  !isCompleted && !isCurrent && "text-muted-foreground",
                  isClickable && !isCurrent && "cursor-pointer",
                  !isClickable && "cursor-default"
                )}
                data-testid={`mobile-step-${step.number}`}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border",
                    isCurrent && "bg-white text-primary border-white",
                    isCompleted && !isCurrent && "bg-primary/15 text-primary border-primary/30",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground border-muted"
                  )}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : step.number}
                </div>
                <span className="text-sm font-medium truncate">{step.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
