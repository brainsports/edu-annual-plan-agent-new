import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { MonthlyPlanTable } from "@/components/MonthlyPlanTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppStore, createInitialMonthlyPlan } from "@/lib/store";
import { ArrowLeft, ArrowRight, Plus, Sparkles, Loader2 } from "lucide-react";
import type { MonthlyPlan } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function MonthlyPlanPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const {
    monthlyPlans,
    extractedPrograms,
    updateMonthlyPlan,
    addMonthlyPlan,
    setCurrentStep,
  } = useAppStore();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (monthlyPlans.length > 0) {
      return `${monthlyPlans[0].year}-${monthlyPlans[0].month}`;
    }
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const currentPlan = monthlyPlans.find((p) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return p.year === year && p.month === month;
  });

  const generateMutation = useMutation({
    mutationFn: async (plan: MonthlyPlan) => {
      const response = await apiRequest("POST", "/api/generate-monthly", {
        plan,
        programs: extractedPrograms,
      });
      
      return response as MonthlyPlan;
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
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = year + 1;
    }

    const existingPlan = monthlyPlans.find(
      (p) => p.year === nextYear && p.month === nextMonth
    );

    if (!existingPlan) {
      const newPlan = createInitialMonthlyPlan(nextYear, nextMonth, extractedPrograms);
      addMonthlyPlan(newPlan);
      setSelectedMonth(`${nextYear}-${nextMonth}`);
      toast({
        title: "월간계획서 추가",
        description: `${nextYear}년 ${nextMonth}월 계획서가 추가되었습니다.`,
      });
    } else {
      setSelectedMonth(`${nextYear}-${nextMonth}`);
    }
  };

  const handleGenerateAI = async () => {
    if (!currentPlan) return;
    setIsGenerating(true);
    await generateMutation.mutateAsync(currentPlan);
  };

  const handlePrev = () => {
    setCurrentStep(3);
    navigate("/annual");
  };

  const handleNext = () => {
    setCurrentStep(5);
    navigate("/complete");
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col">
      <div className="max-w-5xl mx-auto w-full px-4 py-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">월간 사업계획서</h1>
            <p className="text-muted-foreground mt-1">
              월별 사업계획서를 작성하고 관리할 수 있습니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthlyPlans.map((plan) => (
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

            <MonthlyPlanTable
              plan={currentPlan}
              onUpdate={updateMonthlyPlan}
            />
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
          <Button onClick={handleNext} className="gap-2" data-testid="button-complete">
            완료
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
