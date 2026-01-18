import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";

import type { DraftField } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const H4_CATEGORIES = [
  { key: "보호", title: "보호프로그램" },
  { key: "교육", title: "교육프로그램" },
  { key: "문화", title: "문화프로그램" },
  { key: "정서지원", title: "정서지원프로그램" },
  { key: "지역연계", title: "지역사회연계 프로그램" },
];

const H3_SECTIONS = [
  {
    key: "details",
    title: "세부사업내용",
    description: "각 프로그램 영역별 세부 사업 내용을 작성합니다.",
  },
  {
    key: "evaluation",
    title: "평가계획",
    description: "각 프로그램 영역별 평가 계획을 작성합니다.",
  },
];

function buildExamplePart2(): Record<string, DraftField> {
  const examples: Record<string, DraftField> = {};

  const detailsExamples: Record<string, string> = {
    보호: "일상생활 지도 및 급·간식 지원을 통해 아동의 기본 욕구를 충족시키고, 안전하고 안정적인 돌봄 환경을 제공한다.",
    교육: "숙제 지도, 독서 지도, 기초학습 보충 프로그램을 통해 아동의 학습 능력 향상을 지원한다.",
    문화: "미술, 음악, 체육 등 다양한 문화체험 활동을 통해 아동의 정서 발달과 창의성을 증진한다.",
    정서지원: "집단상담, 개별상담, 정서 프로그램을 통해 아동의 심리적 안정과 자아존중감 향상을 도모한다.",
    지역연계: "지역 내 유관기관, 자원봉사자, 후원자와의 연계를 통해 통합적 돌봄 서비스를 제공한다.",
  };

  const evaluationExamples: Record<string, string> = {
    보호: "급·간식 제공 현황, 위생 점검 결과, 아동 건강 상태 모니터링을 통해 보호 서비스의 질을 평가한다.",
    교육: "학습 프로그램 참여율, 학업 성취도 변화, 아동 및 보호자 만족도 조사를 통해 교육 효과를 측정한다.",
    문화: "프로그램 참여율, 활동 결과물 평가, 참여 아동 만족도 조사를 통해 문화 프로그램의 효과를 분석한다.",
    정서지원: "정서 안정 지표 변화, 상담 이력 분석, 자아존중감 척도 사전·사후 비교를 통해 정서지원 효과를 평가한다.",
    지역연계: "연계 기관 수, 자원봉사 참여 현황, 후원금 변화 추이를 통해 지역사회 연계 성과를 측정한다.",
  };

  H4_CATEGORIES.forEach((cat) => {
    examples[`details_${cat.key}`] = {
      keyword: cat.title,
      request: "",
      content: detailsExamples[cat.key] || "",
    };
    examples[`evaluation_${cat.key}`] = {
      keyword: cat.title,
      request: "",
      content: evaluationExamples[cat.key] || "",
    };
  });

  return examples;
}

interface H4ItemCardProps {
  h3Key: string;
  h4Cat: { key: string; title: string };
  field: DraftField | undefined;
  onUpdate: (fullKey: string, field: DraftField) => void;
  onGenerateAI: (fullKey: string) => void;
  isGenerating: boolean;
}

function H4ItemCard({
  h3Key,
  h4Cat,
  field,
  onUpdate,
  onGenerateAI,
  isGenerating,
}: H4ItemCardProps) {
  const fullKey = `${h3Key}_${h4Cat.key}`;
  const [isEditing, setIsEditing] = useState(false);
  const [localKeyword, setLocalKeyword] = useState(field?.keyword ?? "");
  const [localRequest, setLocalRequest] = useState(field?.request ?? "");
  const [localContent, setLocalContent] = useState(field?.content ?? "");

  useEffect(() => {
    if (!isEditing) {
      setLocalKeyword(field?.keyword ?? "");
      setLocalRequest(field?.request ?? "");
      setLocalContent(field?.content ?? "");
    }
  }, [field, isEditing]);

  const handleStartEdit = () => {
    setLocalKeyword(field?.keyword ?? "");
    setLocalRequest(field?.request ?? "");
    setLocalContent(field?.content ?? "");
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdate(fullKey, {
      keyword: localKeyword,
      request: localRequest,
      content: localContent,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div
      className="border rounded-md p-3 bg-muted/30"
      data-testid={`card-h4-${fullKey}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium">{h4Cat.title}</h4>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCancel}
                data-testid={`button-cancel-${fullKey}`}
              >
                <X className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSave}
                data-testid={`button-save-${fullKey}`}
              >
                <Save className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGenerateAI(fullKey)}
                disabled={isGenerating}
                className="h-7 text-xs gap-1 px-2"
                data-testid={`button-ai-${fullKey}`}
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                AI
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleStartEdit}
                data-testid={`button-edit-${fullKey}`}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">키워드</Label>
            <Input
              value={localKeyword}
              onChange={(e) => setLocalKeyword(e.target.value)}
              placeholder="핵심 키워드"
              className="h-8 text-sm"
              data-testid={`input-keyword-${fullKey}`}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">AI 요청사항 (선택)</Label>
            <Input
              value={localRequest}
              onChange={(e) => setLocalRequest(e.target.value)}
              placeholder="AI에게 요청할 내용"
              className="h-8 text-sm"
              data-testid={`input-request-${fullKey}`}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">내용</Label>
            <Textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              rows={4}
              placeholder="세부 내용을 입력하세요"
              className="text-sm"
              data-testid={`textarea-content-${fullKey}`}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {field?.keyword && (
            <span className="text-xs bg-primary/10 px-2 py-0.5 rounded">
              {field.keyword}
            </span>
          )}
          <div className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[40px]">
            {field?.content || "내용을 입력하거나 AI로 생성하세요."}
          </div>
        </div>
      )}
    </div>
  );
}

interface H3SectionCardProps {
  section: { key: string; title: string; description: string };
  part2Data: Record<string, DraftField>;
  onUpdate: (fullKey: string, field: DraftField) => void;
  onGenerateAI: (fullKey: string) => void;
  onGenerateH3: (h3Key: string) => void;
  generatingKey: string | null;
  isGeneratingH3: boolean;
}

function H3SectionCard({
  section,
  part2Data,
  onUpdate,
  onGenerateAI,
  onGenerateH3,
  generatingKey,
  isGeneratingH3,
}: H3SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card data-testid={`card-section-${section.key}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`button-toggle-${section.key}`}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-8">
            {section.description}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGenerateH3(section.key)}
          disabled={isGeneratingH3}
          className="gap-1 text-xs"
          data-testid={`button-ai-h3-${section.key}`}
        >
          {isGeneratingH3 ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          전체 AI 생성
        </Button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3 pt-0">
          {H4_CATEGORIES.map((cat) => {
            const fullKey = `${section.key}_${cat.key}`;
            return (
              <H4ItemCard
                key={fullKey}
                h3Key={section.key}
                h4Cat={cat}
                field={part2Data[fullKey]}
                onUpdate={onUpdate}
                onGenerateAI={onGenerateAI}
                isGenerating={generatingKey === fullKey}
              />
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

export function AnnualPlanPart2Page() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const {
    extractedPrograms,
    annualPlan,
    setAnnualPlan,
    updateAnnualPartField,
    setCurrentStep,
  } = useAppStore();

  const [autoWrite, setAutoWrite] = useState(false);
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [generatingH3, setGeneratingH3] = useState<string | null>(null);

  const safePlan = useMemo(() => {
    if (annualPlan) return annualPlan;
    return {
      id: `annual-${Date.now()}`,
      title: `${new Date().getFullYear()}년 연간사업계획`,
      createdAt: new Date().toISOString(),
      part2: {},
    };
  }, [annualPlan]);

  const part2Data = safePlan.part2 ?? {};

  const isReadyForAuto = useMemo(() => {
    return Array.isArray(extractedPrograms) && extractedPrograms.length > 0;
  }, [extractedPrograms]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/generate-annual-part2", {
        annualPlan: safePlan,
        programs: extractedPrograms,
      });
      const data = res instanceof Response ? await res.json() : res;
      return data;
    },
    onSuccess: (data: any) => {
      setAnnualPlan(data);
      toast({
        title: "자동 작성 완료",
        description: "PART 2 초안을 생성했습니다.",
      });
    },
    onError: () => {
      toast({
        title: "자동 작성 실패",
        description: "생성에 실패했습니다. 연결 상태를 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleWrite = async (nextAuto: boolean) => {
    setAutoWrite(nextAuto);

    if (!nextAuto) {
      const part2 = buildExamplePart2();
      const next = {
        ...safePlan,
        part2,
      };
      setAnnualPlan(next);
      toast({
        title: "예시 작성 완료",
        description: "PART 2 전체를 예시 데이터로 채웠습니다.",
      });
      return;
    }

    if (!isReadyForAuto) {
      toast({
        title: "자동 작성 불가",
        description: "먼저 2단계에서 프로그램 자동 분류가 되어야 합니다.",
        variant: "destructive",
      });
      setAutoWrite(false);
      return;
    }

    await generateMutation.mutateAsync();
  };

  const handleUpdateField = (fullKey: string, field: DraftField) => {
    if (!annualPlan) {
      setAnnualPlan({
        ...safePlan,
        part2: { [fullKey]: field },
      });
    } else {
      updateAnnualPartField("part2", fullKey, field);
    }
  };

  const handleGenerateAIField = async (fullKey: string) => {
    setGeneratingKey(fullKey);
    try {
      const [h3Key, h4Key] = fullKey.split("_");
      const h3Title = H3_SECTIONS.find((s) => s.key === h3Key)?.title ?? h3Key;
      const h4Title =
        H4_CATEGORIES.find((c) => c.key === h4Key)?.title ?? h4Key;

      const res = await apiRequest("POST", "/api/generate", {
        sectionId: fullKey,
        field: "content",
        context: `PART2 - ${h3Title} > ${h4Title}`,
        programs: extractedPrograms,
      });
      const data = res instanceof Response ? await res.json() : res;

      if (data?.content) {
        const currentField = part2Data[fullKey] ?? {
          keyword: "",
          request: "",
          content: "",
        };
        handleUpdateField(fullKey, {
          ...currentField,
          content: data.content,
        });
        toast({
          title: "AI 생성 완료",
          description: `${h4Title} 섹션이 생성되었습니다.`,
        });
      }
    } catch {
      toast({
        title: "AI 생성 실패",
        description: "섹션 생성에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setGeneratingKey(null);
    }
  };

  const handleGenerateH3 = async (h3Key: string) => {
    setGeneratingH3(h3Key);
    const h3Title = H3_SECTIONS.find((s) => s.key === h3Key)?.title ?? h3Key;

    try {
      for (const cat of H4_CATEGORIES) {
        const fullKey = `${h3Key}_${cat.key}`;
        const res = await apiRequest("POST", "/api/generate", {
          sectionId: fullKey,
          field: "content",
          context: `PART2 - ${h3Title} > ${cat.title}`,
          programs: extractedPrograms,
        });
        const data = res instanceof Response ? await res.json() : res;

        if (data?.content) {
          const currentField = part2Data[fullKey] ?? {
            keyword: cat.title,
            request: "",
            content: "",
          };
          handleUpdateField(fullKey, {
            ...currentField,
            keyword: cat.title,
            content: data.content,
          });
        }
      }
      toast({
        title: "AI 생성 완료",
        description: `${h3Title} 전체 섹션이 생성되었습니다.`,
      });
    } catch {
      toast({
        title: "AI 생성 실패",
        description: "일부 섹션 생성에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setGeneratingH3(null);
    }
  };

  const goPrev = () => {
    navigate("/annual/part1");
  };

  const goNext = () => {
    setCurrentStep(5);
    navigate("/monthly/first-half");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-muted-foreground" data-testid="heading-part2">
              세부사업내용과 평가계획을 영역별로 작성합니다.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              추출된 프로그램 정보: {extractedPrograms?.length ?? 0}개
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={!autoWrite ? "default" : "outline"}
              size="sm"
              onClick={() => handleWrite(false)}
              disabled={generateMutation.isPending}
              data-testid="button-example-write"
            >
              예시 작성
            </Button>
            <Button
              variant={autoWrite ? "default" : "outline"}
              size="sm"
              onClick={() => handleWrite(true)}
              disabled={generateMutation.isPending}
              className="gap-1"
              data-testid="button-auto-write"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              자동 작성
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">입력 / 편집</h2>
            {H3_SECTIONS.map((section) => (
              <H3SectionCard
                key={section.key}
                section={section}
                part2Data={part2Data}
                onUpdate={handleUpdateField}
                onGenerateAI={handleGenerateAIField}
                onGenerateH3={handleGenerateH3}
                generatingKey={generatingKey}
                isGeneratingH3={generatingH3 === section.key}
              />
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">미리보기</h2>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-base">
                  연간사업계획서 PART 2
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {H3_SECTIONS.map((section) => (
                  <div key={section.key} className="space-y-3">
                    <h3 className="font-semibold text-sm border-b pb-1">
                      {section.title}
                    </h3>
                    <div className="space-y-3 pl-2">
                      {H4_CATEGORIES.map((cat) => {
                        const fullKey = `${section.key}_${cat.key}`;
                        const field = part2Data[fullKey];
                        return (
                          <div key={fullKey} className="space-y-1">
                            <h4 className="text-xs font-medium text-muted-foreground">
                              {cat.title}
                            </h4>
                            <div className="text-sm whitespace-pre-wrap pl-3 border-l-2 border-muted">
                              {field?.content || "(내용 없음)"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="max-w-7xl mx-auto flex justify-between">
          <Button
            variant="outline"
            onClick={goPrev}
            className="gap-2"
            data-testid="button-prev-part1"
          >
            <ChevronLeft className="w-4 h-4" />
            이전 단계 (연간 Part1)
          </Button>
          <Button
            onClick={goNext}
            className="gap-2"
            data-testid="button-next-monthly"
          >
            다음 단계 (월간계획 상반기)
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AnnualPlanPart2Page;
