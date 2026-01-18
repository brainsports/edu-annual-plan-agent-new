import { useEffect, useMemo, useState } from "react";
import { useLocation, type RouteComponentProps } from "wouter";
import { useMutation } from "@tanstack/react-query";

import { MonthlyPlanTable } from "@/components/MonthlyPlanTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppStore, createInitialMonthlyPlan } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, Plus, Sparkles, Loader2 } from "lucide-react";
import type { MonthlyPlan } from "@shared/schema";

/** ✅ 월간 상/하반기 분기용 모드 */
export type MonthlyPlanMode = "ALL" | "FIRST_HALF" | "SECOND_HALF";

/**
 * ✅ Route(component=...)에 넣기 위한 핵심
 * - wouter Route는 RouteComponentProps 형태의 props를 넘길 수 있으므로
 * - Props에 RouteComponentProps를 합쳐줘야 타입 에러가 사라집니다.
 */
type Props = RouteComponentProps & {
  mode?: MonthlyPlanMode; // ✅ 선택(없으면 ALL)
};

function isVisibleMonth(month: number, mode: MonthlyPlanMode) {
  if (mode === "ALL") return true;
  if (mode === "FIRST_HALF") return month >= 1 && month <= 6;
  return month >= 7 && month <= 12; // SECOND_HALF
}

export function MonthlyPlanPage({ mode = "ALL" }: Props) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const {
    monthlyPlans,
    extractedPrograms,
    updateMonthlyPlan,
    addMonthlyPlan,
    setCurrentStep,
  } = useAppStore();

  /** ✅ 모드(상/하반기)에 따라 보여줄 월간계획서만 필터 */
  const visibleMonthlyPlans = useMemo(() => {
    return monthlyPlans
      .filter((p) => isVisibleMonth(p.month, mode))
      .sort((a, b) => a.year - b.year || a.month - b.month);
  }, [monthlyPlans, mode]);

  /** ✅ 선택 월 (초기값은 “보이는 목록”의 첫 항목, 없으면 현재월) */
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const first = visibleMonthlyPlans[0];
    if (first) return `${first.year}-${first.month}`;
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  });

  /** ✅ mode/visible 목록이 바뀌면 selectedMonth가 유효한지 보정 */
  useEffect(() => {
    if (visibleMonthlyPlans.length === 0) return;

    const [year, month] = selectedMonth.split("-").map(Number);
    const ok = visibleMonthlyPlans.some(
      (p) => p.year === year && p.month === month,
    );

    if (!ok) {
      const first = visibleMonthlyPlans[0];
      setSelectedMonth(`${first.year}-${first.month}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, visibleMonthlyPlans.length]);

  const currentPlan = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return monthlyPlans.find((p) => p.year === year && p.month === month);
  }, [monthlyPlans, selectedMonth]);

  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async (plan: MonthlyPlan) => {
      const raw = await apiRequest("POST", "/api/generate-monthly", {
        plan,
        programs: extractedPrograms,
      });

      // apiRequest가 Response를 돌려줄 수도, JSON 객체를 돌려줄 수도 있어서 안전 처리
      const data = raw instanceof Response ? await raw.json() : raw;
      return data as MonthlyPlan;
    },
    onSuccess: (data) => {
      updateMonthlyPlan(data);
      toast({
        title: "생성 완료",
        description: "AI가 월간계획서 내용을 생성했습니다.",
      });
    },
    onError: () => {
      toast({
        title: "생성 실패",
        description: "내용 생성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    },
  });

  const handleAddMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);

    // 다음 달 계산
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = year + 1;
    }

    // ✅ 상/하반기 모드면 범위를 넘어가는 추가를 막음
    if (!isVisibleMonth(nextMonth, mode)) {
      toast({
        title: "추가 불가",
        description:
          mode === "FIRST_HALF"
            ? "상반기(1~6월) 범위에서만 추가할 수 있습니다."
            : mode === "SECOND_HALF"
              ? "하반기(7~12월) 범위에서만 추가할 수 있습니다."
              : "추가할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const existingPlan = monthlyPlans.find(
      (p) => p.year === nextYear && p.month === nextMonth,
    );

    if (!existingPlan) {
      const newPlan = createInitialMonthlyPlan(
        nextYear,
        nextMonth,
        extractedPrograms,
      );
      addMonthlyPlan(newPlan);
      toast({
        title: "월간계획서 추가",
        description: `${nextYear}년 ${nextMonth}월 계획서가 추가되었습니다.`,
      });
    }

    setSelectedMonth(`${nextYear}-${nextMonth}`);
  };

  const handleGenerateAI = async () => {
    if (!currentPlan) return;
    setIsGenerating(true);
    await generateMutation.mutateAsync(currentPlan);
  };

  const handlePrev = () => {
    // ✅ 7단계 기준: 월간(5/6단계)의 이전은 연간 PART2(4단계)
    setCurrentStep(4);
    navigate("/annual/part2");
  };

  const handleNext = () => {
    // ✅ 상반기(5단계) → 하반기(6단계) / 하반기(6단계) → 다운로드(7단계)
    if (mode === "FIRST_HALF") {
      setCurrentStep(6);
      navigate("/monthly/second-half");
      return;
    }
    setCurrentStep(7);
    navigate("/download");
  };

  const pageTitle =
    mode === "FIRST_HALF"
      ? "월간 사업계획서 (상반기 1~6월)"
      : mode === "SECOND_HALF"
        ? "월간 사업계획서 (하반기 7~12월)"
        : "월간 사업계획서";

  const pageDesc =
    mode === "FIRST_HALF"
      ? "상반기(1~6월) 계획서를 작성하고 관리할 수 있습니다."
      : mode === "SECOND_HALF"
        ? "하반기(7~12월) 계획서를 작성하고 관리할 수 있습니다."
        : "월별 사업계획서를 작성하고 관리할 수 있습니다.";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-muted-foreground">{pageDesc}</p>

          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[160px]" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibleMonthlyPlans.map((plan) => (
                  <SelectItem
                    key={`${plan.year}-${plan.month}`}
                    value={`${plan.year}-${plan.month}`}
                  >
                    {plan.year}년 {plan.month}월
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={handleAddMonth}
              data-testid="button-add-month"
              title="다음 달 추가"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {currentPlan ? (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="gap-2"
                data-testid="button-ai-generate-monthly"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                AI로 내용 생성
              </Button>
            </div>

            <MonthlyPlanTable plan={currentPlan} onUpdate={updateMonthlyPlan} />
          </div>
        ) : (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground mb-4">
                선택한 월의 계획서가 없습니다.
              </p>
              <Button onClick={handleAddMonth} data-testid="button-create-plan">
                계획서 생성
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="max-w-5xl mx-auto flex justify-between">
          <Button variant="outline" onClick={handlePrev} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            이전 단계
          </Button>

          <Button
            onClick={handleNext}
            className="gap-2"
            data-testid="button-next"
          >
            다음 단계
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
