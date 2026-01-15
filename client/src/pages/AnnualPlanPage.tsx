import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { AnnualPlanSection } from "@/components/AnnualPlanSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppStore, createInitialMonthlyPlan } from "@/lib/store";
import { ArrowLeft, ArrowRight, Edit2, Save, X, Sparkles, Loader2 } from "lucide-react";
import type { AnnualPlanSection as AnnualPlanSectionType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function AnnualPlanPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const {
    annualPlan,
    extractedPrograms,
    updateAnnualPlanSection,
    updateAnnualPlanField,
    addMonthlyPlan,
    setCurrentStep,
  } = useAppStore();

  const [isEditingNecessity, setIsEditingNecessity] = useState(false);
  const [isEditingEvaluation, setIsEditingEvaluation] = useState(false);
  const [necessity, setNecessity] = useState(annualPlan?.necessity || "");
  const [evaluation, setEvaluation] = useState(annualPlan?.overallEvaluation || "");
  const [generatingField, setGeneratingField] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async ({
      sectionId,
      field,
      context,
    }: {
      sectionId?: string;
      field: string;
      context: string;
    }) => {
      const response = await apiRequest("POST", "/api/generate", {
        sectionId,
        field,
        context,
        programs: extractedPrograms,
      });
      
      return response as { content: string };
    },
    onSuccess: (data, variables) => {
      if (variables.sectionId) {
        const section = annualPlan?.sections.find((s) => s.id === variables.sectionId);
        if (section) {
          updateAnnualPlanSection({
            ...section,
            [variables.field]: data.content,
          });
        }
      } else if (variables.field === "necessity") {
        updateAnnualPlanField("necessity", data.content);
        setNecessity(data.content);
      } else if (variables.field === "overallEvaluation") {
        updateAnnualPlanField("overallEvaluation", data.content);
        setEvaluation(data.content);
      }
      toast({
        title: "생성 완료",
        description: "AI가 내용을 생성했습니다.",
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
      setGeneratingField(null);
    },
  });

  const handleGenerateNecessity = async () => {
    setGeneratingField("necessity");
    await generateMutation.mutateAsync({
      field: "necessity",
      context: "사업의 필요성 및 지역적 특성",
    });
  };

  const handleGenerateEvaluation = async () => {
    setGeneratingField("overallEvaluation");
    await generateMutation.mutateAsync({
      field: "overallEvaluation",
      context: "전년도 사업평가 총평",
    });
  };

  const handleGenerateSectionAI = async (sectionId: string, field: "problems" | "improvements") => {
    const section = annualPlan?.sections.find((s) => s.id === sectionId);
    if (!section) return;

    setGeneratingField(`${sectionId}-${field}`);
    await generateMutation.mutateAsync({
      sectionId,
      field,
      context: field === "problems" ? "문제점(사업평가)" : "개선계획(환류)",
    });
  };

  const handleSaveNecessity = () => {
    updateAnnualPlanField("necessity", necessity);
    setIsEditingNecessity(false);
    toast({ title: "저장 완료" });
  };

  const handleSaveEvaluation = () => {
    updateAnnualPlanField("overallEvaluation", evaluation);
    setIsEditingEvaluation(false);
    toast({ title: "저장 완료" });
  };

  const handlePrev = () => {
    setCurrentStep(2);
    navigate("/classify");
  };

  const handleNext = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const monthlyPlan = createInitialMonthlyPlan(
      currentYear,
      currentMonth,
      extractedPrograms
    );
    addMonthlyPlan(monthlyPlan);

    setCurrentStep(4);
    navigate("/monthly");
  };

  if (!annualPlan) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">연간계획서 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">{annualPlan.title}</h1>
          <p className="text-muted-foreground mt-1">
            연간 사업계획서의 각 항목을 작성하고 수정할 수 있습니다
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-lg">1. 사업의 필요성</CardTitle>
              <div className="flex items-center gap-1">
                {!isEditingNecessity && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateNecessity}
                    disabled={generatingField === "necessity"}
                    className="h-8"
                    data-testid="button-ai-necessity"
                  >
                    {generatingField === "necessity" ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    AI 생성
                  </Button>
                )}
                {isEditingNecessity ? (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingNecessity(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleSaveNecessity}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setIsEditingNecessity(true)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingNecessity ? (
                <Textarea
                  value={necessity}
                  onChange={(e) => setNecessity(e.target.value)}
                  rows={8}
                  placeholder="이용아동의 욕구 및 지역적 특성을 작성해주세요..."
                  data-testid="textarea-necessity"
                />
              ) : (
                <p className="text-sm bg-muted p-4 rounded-md whitespace-pre-wrap min-h-[120px]">
                  {annualPlan.necessity || "사업의 필요성을 작성해주세요."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. 전년도 사업평가 및 환류 계획</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {annualPlan.sections.map((section) => (
                <AnnualPlanSection
                  key={section.id}
                  section={section}
                  onUpdate={updateAnnualPlanSection}
                  onGenerateAI={handleGenerateSectionAI}
                  isGenerating={generatingField?.startsWith(section.id) || false}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-lg">3. 총평</CardTitle>
              <div className="flex items-center gap-1">
                {!isEditingEvaluation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateEvaluation}
                    disabled={generatingField === "overallEvaluation"}
                    className="h-8"
                    data-testid="button-ai-evaluation"
                  >
                    {generatingField === "overallEvaluation" ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    AI 생성
                  </Button>
                )}
                {isEditingEvaluation ? (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingEvaluation(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleSaveEvaluation}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setIsEditingEvaluation(true)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingEvaluation ? (
                <Textarea
                  value={evaluation}
                  onChange={(e) => setEvaluation(e.target.value)}
                  rows={6}
                  placeholder="전년도 운영에 대한 총평을 작성해주세요..."
                  data-testid="textarea-evaluation"
                />
              ) : (
                <p className="text-sm bg-muted p-4 rounded-md whitespace-pre-wrap min-h-[100px]">
                  {annualPlan.overallEvaluation || "총평을 작성해주세요."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="max-w-4xl mx-auto flex justify-between">
          <Button variant="outline" onClick={handlePrev} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            이전 단계
          </Button>
          <Button onClick={handleNext} className="gap-2" data-testid="button-next-monthly">
            월간계획서 작성
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
