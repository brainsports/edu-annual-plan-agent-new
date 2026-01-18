import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  useAppStore,
  createInitialMonthlyPlan,
  filterProgramsByMonth,
  sortProgramsByCategory,
} from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
} from "lucide-react";
import type { MonthlyPlan, ProgramInfo } from "@shared/schema";

const SECOND_HALF_MONTHS = [7, 8, 9, 10, 11, 12];

interface MonthlyOverview {
  objectives: string;
  focus: string;
  notes: string;
}

interface WeeklyTask {
  week: number;
  tasks: string;
}

interface MonthData {
  overview: MonthlyOverview;
  weeklyTasks: WeeklyTask[];
}

function buildExampleMonthData(): MonthData {
  return {
    overview: {
      objectives: "월별 사업 목표를 입력합니다.",
      focus: "이달의 중점사항을 입력합니다.",
      notes: "기타 참고 사항을 입력합니다.",
    },
    weeklyTasks: [
      { week: 1, tasks: "1주차 주요 업무를 입력합니다." },
      { week: 2, tasks: "2주차 주요 업무를 입력합니다." },
      { week: 3, tasks: "3주차 주요 업무를 입력합니다." },
      { week: 4, tasks: "4주차 주요 업무를 입력합니다." },
    ],
  };
}

function parseOverviewFromObjectives(objectives: string): MonthlyOverview {
  try {
    if (objectives.startsWith("{")) {
      const parsed = JSON.parse(objectives);
      return {
        objectives: parsed.objectives || "",
        focus: parsed.focus || "",
        notes: parsed.notes || "",
      };
    }
  } catch {}
  return { objectives: objectives || "", focus: "", notes: "" };
}

function serializeOverviewToObjectives(overview: MonthlyOverview): string {
  return JSON.stringify({
    objectives: overview.objectives,
    focus: overview.focus,
    notes: overview.notes,
  });
}

function getMonthDataFromPlan(plan: MonthlyPlan | undefined): MonthData {
  if (!plan) {
    return {
      overview: { objectives: "", focus: "", notes: "" },
      weeklyTasks: [
        { week: 1, tasks: "" },
        { week: 2, tasks: "" },
        { week: 3, tasks: "" },
        { week: 4, tasks: "" },
      ],
    };
  }

  return {
    overview: parseOverviewFromObjectives(plan.objectives || ""),
    weeklyTasks:
      plan.weeklyTasks?.map((w) => ({
        week: w.week,
        tasks: Array.isArray(w.tasks) ? w.tasks.join("\n") : "",
      })) || [
        { week: 1, tasks: "" },
        { week: 2, tasks: "" },
        { week: 3, tasks: "" },
        { week: 4, tasks: "" },
      ],
  };
}

function ProgramTable({
  programs,
  month,
}: {
  programs: ProgramInfo[];
  month: number;
}) {
  const sortedPrograms = useMemo(
    () => sortProgramsByCategory(programs),
    [programs]
  );

  if (sortedPrograms.length === 0) {
    return (
      <div className="text-muted-foreground text-sm py-2">
        {month}월에 배정된 프로그램이 없습니다.
      </div>
    );
  }

  return (
    <Table data-testid={`table-programs-${month}`}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px] font-semibold">대분류</TableHead>
          <TableHead className="w-[80px] font-semibold">중분류</TableHead>
          <TableHead className="w-[120px] font-semibold">프로그램명</TableHead>
          <TableHead className="w-[80px] font-semibold">대상</TableHead>
          <TableHead className="w-[100px] font-semibold">실행일자</TableHead>
          <TableHead className="w-[80px] font-semibold">수행인력</TableHead>
          <TableHead className="font-semibold">사업내용</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedPrograms.map((p) => (
          <TableRow key={p.id} data-testid={`row-program-${p.id}`}>
            <TableCell className="font-medium">{p.category}</TableCell>
            <TableCell>{p.subCategory}</TableCell>
            <TableCell>{p.programName}</TableCell>
            <TableCell>{p.targetChildren}</TableCell>
            <TableCell>{p.executionDate || p.startDate || "-"}</TableCell>
            <TableCell>{p.personnel || "-"}</TableCell>
            <TableCell className="whitespace-pre-wrap">
              {p.serviceContent || p.plan || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MonthCard({
  month,
  year,
  data,
  programs,
  onUpdate,
  onGenerateAI,
  isGenerating,
}: {
  month: number;
  year: number;
  data: MonthData;
  programs: ProgramInfo[];
  onUpdate: (data: MonthData) => void;
  onGenerateAI: () => void;
  isGenerating: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    if (!isEditing) {
      setLocalData(data);
    }
  }, [data, isEditing]);

  const handleSave = () => {
    onUpdate(localData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalData(data);
    setIsEditing(false);
  };

  const handleAddWeek = () => {
    const nextWeek = localData.weeklyTasks.length + 1;
    setLocalData({
      ...localData,
      weeklyTasks: [...localData.weeklyTasks, { week: nextWeek, tasks: "" }],
    });
  };

  const handleRemoveWeek = (weekIndex: number) => {
    const updated = localData.weeklyTasks.filter((_, i) => i !== weekIndex);
    const renumbered = updated.map((w, i) => ({ ...w, week: i + 1 }));
    setLocalData({ ...localData, weeklyTasks: renumbered });
  };

  const handleWeekChange = (weekIndex: number, tasks: string) => {
    const updated = localData.weeklyTasks.map((w, i) =>
      i === weekIndex ? { ...w, tasks } : w
    );
    setLocalData({ ...localData, weeklyTasks: updated });
  };

  const handleOverviewChange = (field: keyof MonthlyOverview, value: string) => {
    setLocalData({
      ...localData,
      overview: { ...localData.overview, [field]: value },
    });
  };

  return (
    <Card data-testid={`card-month-${month}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">
          {month}월 사업계획서
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateAI}
            disabled={isGenerating || isEditing}
            className="gap-1"
            data-testid={`button-ai-month-${month}`}
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            AI 생성
          </Button>
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                data-testid={`button-cancel-month-${month}`}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                data-testid={`button-save-month-${month}`}
              >
                <Save className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              data-testid={`button-edit-month-${month}`}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-primary">
            사업내용 및 수행인력
          </h4>
          <div className="overflow-x-auto">
            <ProgramTable programs={programs} month={month} />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">
            월간 사업 개요
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] font-semibold">항목</TableHead>
                <TableHead>내용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">사업목표</TableCell>
                <TableCell>
                  {isEditing ? (
                    <Textarea
                      value={localData.overview.objectives}
                      onChange={(e) =>
                        handleOverviewChange("objectives", e.target.value)
                      }
                      className="min-h-[60px]"
                      data-testid={`textarea-objectives-${month}`}
                    />
                  ) : (
                    <span className="whitespace-pre-wrap">
                      {data.overview.objectives || "(내용 없음)"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">중점사항</TableCell>
                <TableCell>
                  {isEditing ? (
                    <Textarea
                      value={localData.overview.focus}
                      onChange={(e) =>
                        handleOverviewChange("focus", e.target.value)
                      }
                      className="min-h-[60px]"
                      data-testid={`textarea-focus-${month}`}
                    />
                  ) : (
                    <span className="whitespace-pre-wrap">
                      {data.overview.focus || "(내용 없음)"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">비고</TableCell>
                <TableCell>
                  {isEditing ? (
                    <Textarea
                      value={localData.overview.notes}
                      onChange={(e) =>
                        handleOverviewChange("notes", e.target.value)
                      }
                      className="min-h-[40px]"
                      data-testid={`textarea-notes-${month}`}
                    />
                  ) : (
                    <span className="whitespace-pre-wrap">
                      {data.overview.notes || "(내용 없음)"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-muted-foreground">
              주요 업무 계획
            </h4>
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddWeek}
                className="gap-1"
                data-testid={`button-add-week-${month}`}
              >
                <Plus className="w-3 h-3" />
                주차 추가
              </Button>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] font-semibold">구분</TableHead>
                <TableHead>주요 업무</TableHead>
                {isEditing && (
                  <TableHead className="w-[50px]"></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {localData.weeklyTasks.map((wt, idx) => (
                <TableRow key={wt.week}>
                  <TableCell className="font-medium">{wt.week}주</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={wt.tasks}
                        onChange={(e) => handleWeekChange(idx, e.target.value)}
                        data-testid={`input-week-${month}-${wt.week}`}
                      />
                    ) : (
                      <span className="whitespace-pre-wrap">
                        {wt.tasks || "(내용 없음)"}
                      </span>
                    )}
                  </TableCell>
                  {isEditing && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveWeek(idx)}
                        className="text-destructive"
                        data-testid={`button-remove-week-${month}-${wt.week}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {localData.weeklyTasks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isEditing ? 3 : 2}
                    className="text-center text-muted-foreground py-4"
                  >
                    주간 업무가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewPanel({
  months,
  monthDataMap,
  year,
}: {
  months: number[];
  monthDataMap: Record<number, MonthData>;
  year: number;
}) {
  return (
    <Card className="sticky top-24 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">미리보기 (하반기)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {months.map((m) => {
          const md = monthDataMap[m];
          if (!md) return null;

          const hasContent =
            md.overview.objectives ||
            md.overview.focus ||
            md.overview.notes ||
            md.weeklyTasks.some((w) => w.tasks);

          return (
            <div key={m} className="space-y-2">
              <h3 className="font-semibold text-base border-b pb-1">
                {m}월 사업계획서
              </h3>
              {hasContent ? (
                <>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs font-medium">
                      사업목표
                    </div>
                    <div className="whitespace-pre-wrap">
                      {md.overview.objectives || "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs font-medium">
                      중점사항
                    </div>
                    <div className="whitespace-pre-wrap">
                      {md.overview.focus || "-"}
                    </div>
                  </div>
                  {md.overview.notes && (
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-xs font-medium">
                        비고
                      </div>
                      <div className="whitespace-pre-wrap">
                        {md.overview.notes}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs font-medium">
                      주요 업무
                    </div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {md.weeklyTasks.map((wt) =>
                        wt.tasks ? (
                          <li key={wt.week}>
                            {wt.week}주: {wt.tasks}
                          </li>
                        ) : null
                      )}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">(내용 없음)</div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function MonthlyPlanSecondHalfPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const {
    monthlyPlans,
    extractedPrograms,
    updateMonthlyPlan,
    addMonthlyPlan,
    setCurrentStep,
  } = useAppStore();

  const year = useMemo(() => new Date().getFullYear(), []);
  const [selectedMonth, setSelectedMonth] = useState("7");
  const [generatingMonth, setGeneratingMonth] = useState<number | null>(null);

  useEffect(() => {
    SECOND_HALF_MONTHS.forEach((m) => {
      const exists = monthlyPlans.some((p) => p.year === year && p.month === m);
      if (!exists) {
        const newPlan = createInitialMonthlyPlan(year, m, extractedPrograms);
        addMonthlyPlan(newPlan);
      }
    });
  }, [year, monthlyPlans, extractedPrograms, addMonthlyPlan]);

  const secondHalfPlans = useMemo(() => {
    return monthlyPlans
      .filter((p) => p.year === year && SECOND_HALF_MONTHS.includes(p.month))
      .sort((a, b) => a.month - b.month);
  }, [monthlyPlans, year]);

  const monthDataMap = useMemo(() => {
    const map: Record<number, MonthData> = {};
    SECOND_HALF_MONTHS.forEach((m) => {
      const plan = secondHalfPlans.find((p) => p.month === m);
      map[m] = getMonthDataFromPlan(plan);
    });
    return map;
  }, [secondHalfPlans]);

  const monthProgramsMap = useMemo(() => {
    const map: Record<number, ProgramInfo[]> = {};
    SECOND_HALF_MONTHS.forEach((m) => {
      map[m] = filterProgramsByMonth(extractedPrograms, m);
    });
    return map;
  }, [extractedPrograms]);

  const handleUpdateMonthData = (month: number, data: MonthData) => {
    const existingPlan = secondHalfPlans.find((p) => p.month === month);
    if (!existingPlan) return;

    const updatedPlan: MonthlyPlan = {
      ...existingPlan,
      objectives: serializeOverviewToObjectives(data.overview),
      weeklyTasks: data.weeklyTasks.map((wt) => ({
        week: wt.week,
        tasks: wt.tasks
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean),
      })),
    };

    updateMonthlyPlan(updatedPlan);
  };

  const generateMonthMutation = useMutation({
    mutationFn: async (month: number) => {
      const plan = secondHalfPlans.find((p) => p.month === month);
      if (!plan) throw new Error("Plan not found");

      const res = await apiRequest("POST", "/api/generate-monthly", {
        plan,
        programs: extractedPrograms,
      });
      const data = res instanceof Response ? await res.json() : res;
      return data as MonthlyPlan;
    },
    onSuccess: (data) => {
      updateMonthlyPlan(data);
      toast({
        title: "AI 생성 완료",
        description: `${data.month}월 계획이 생성되었습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "생성 실패",
        description: "AI 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setGeneratingMonth(null);
    },
  });

  const handleGenerateAI = async (month: number) => {
    setGeneratingMonth(month);
    await generateMonthMutation.mutateAsync(month);
  };

  const handleExampleFill = () => {
    SECOND_HALF_MONTHS.forEach((m) => {
      const exampleData = buildExampleMonthData();
      handleUpdateMonthData(m, exampleData);
    });
    toast({
      title: "예시 작성 완료",
      description: "하반기 전체를 예시 데이터로 채웠습니다.",
    });
  };

  const handlePrev = () => {
    setCurrentStep(5);
    navigate("/monthly/first-half");
  };

  const handleNext = () => {
    setCurrentStep(7);
    navigate("/download");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-muted-foreground" data-testid="heading-second-half">
            7월~12월 월별 사업계획을 작성합니다.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleExampleFill}
              data-testid="button-example-fill"
            >
              예시 작성
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <Tabs
              value={selectedMonth}
              onValueChange={setSelectedMonth}
              className="space-y-4"
            >
              <TabsList className="grid grid-cols-6 w-full">
                {SECOND_HALF_MONTHS.map((m) => (
                  <TabsTrigger
                    key={m}
                    value={String(m)}
                    data-testid={`tab-month-${m}`}
                  >
                    {m}월
                  </TabsTrigger>
                ))}
              </TabsList>

              {SECOND_HALF_MONTHS.map((m) => (
                <TabsContent key={m} value={String(m)}>
                  <MonthCard
                    month={m}
                    year={year}
                    data={monthDataMap[m]}
                    programs={monthProgramsMap[m]}
                    onUpdate={(data) => handleUpdateMonthData(m, data)}
                    onGenerateAI={() => handleGenerateAI(m)}
                    isGenerating={generatingMonth === m}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="lg:col-span-2 hidden lg:block">
            <PreviewPanel
              months={SECOND_HALF_MONTHS}
              monthDataMap={monthDataMap}
              year={year}
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="max-w-7xl mx-auto flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            className="gap-2"
            data-testid="button-prev"
          >
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
