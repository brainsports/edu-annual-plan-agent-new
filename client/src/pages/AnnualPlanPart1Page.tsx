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
import { Sparkles, Loader2, ChevronRight, Edit2, Save, X } from "lucide-react";

interface SectionDef {
  key: string;
  title: string;
  description: string;
}

const PART1_SECTIONS: SectionDef[] = [
  {
    key: "necessity",
    title: "1. 사업의 필요성",
    description: "이용아동의 욕구 및 문제점, 지역 환경적 특성",
  },
  {
    key: "evaluationAndFeedback",
    title: "2. 전년도 사업평가 및 환류계획",
    description: "차년도 사업 환류 계획, 총평",
  },
  {
    key: "satisfaction",
    title: "3. 만족도조사",
    description: "만족도 조사 결과 및 개선점",
  },
  {
    key: "purpose",
    title: "4. 사업목적",
    description: "사업의 궁극적인 목적",
  },
  {
    key: "goals",
    title: "5. 사업목표",
    description: "구체적이고 측정 가능한 목표",
  },
];

function buildExamplePart1(extractedPrograms: any[]): Record<string, DraftField> {
  const programNames =
    extractedPrograms?.map((p) => p.programName).filter(Boolean) ?? [];

  return {
    necessity: {
      keyword: "지역의 한계",
      request: "",
      content:
        "이 사업은 아동의 일상 돌봄과 정서 지원이 동시에 필요하다는 현장 요구를 반영한다.\n" +
        "특히 참여 아동은 생활 환경의 제약으로 인해 안정적인 학습·관계 경험이 부족할 수 있어, 센터의 체계적인 지원이 필요하다.\n" +
        `본 연간계획은 다음과 같은 프로그램 운영 흐름을 기반으로 구성한다: ${programNames.join(", ") || "프로그램 A, 프로그램 B"}`,
    },
    evaluationAndFeedback: {
      keyword: "정서지원, 참여율, 환류",
      request: "",
      content:
        "전년도 운영 결과를 바탕으로 참여율·만족도·목표 달성 수준을 점검한다.\n" +
        "주요 개선점은 프로그램 난이도 조절, 참여 동기 강화, 보호자/기관 연계 강화로 정리한다.\n" +
        "환류 계획은 (1) 중간 점검 회의 (2) 아동 피드백 반영 (3) 운영 매뉴얼 보완 순으로 진행한다.",
    },
    satisfaction: {
      keyword: "만족도, 개선점",
      request: "",
      content:
        "만족도 조사는 아동·보호자·담당자 관점에서 실시한다.\n" +
        "문항은 흥미도/유익성/진행 적절성/재참여 의향 중심으로 구성하고, 자유응답으로 개선점을 수집한다.",
    },
    purpose: {
      keyword: "정서·사회성, 학습지원",
      request: "",
      content:
        "아동의 건강한 성장과 일상 안정에 필요한 정서·사회성 지원을 강화한다.\n" +
        "학습·관계 경험을 보완하여 학교생활 및 또래관계 적응을 돕는다.",
    },
    goals: {
      keyword: "구체화, 측정가능",
      request: "",
      content:
        "1) 정서 안정감 향상을 위한 정기 활동을 운영한다.\n" +
        "2) 또래 협력 활동을 통해 사회성 기술을 강화한다.\n" +
        "3) 참여 지속률과 만족도를 개선하여 운영의 질을 높인다.",
    },
  };
}

interface Part1SectionCardProps {
  sectionDef: SectionDef;
  field: DraftField | undefined;
  onUpdate: (key: string, field: DraftField) => void;
  onGenerateAI: (key: string) => void;
  isGenerating: boolean;
}

function Part1SectionCard({
  sectionDef,
  field,
  onUpdate,
  onGenerateAI,
  isGenerating,
}: Part1SectionCardProps) {
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
    onUpdate(sectionDef.key, {
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
    <Card data-testid={`card-section-${sectionDef.key}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{sectionDef.title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {sectionDef.description}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                data-testid={`button-cancel-${sectionDef.key}`}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                data-testid={`button-save-${sectionDef.key}`}
              >
                <Save className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGenerateAI(sectionDef.key)}
                disabled={isGenerating}
                className="h-8 text-xs gap-1"
                data-testid={`button-ai-${sectionDef.key}`}
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                AI 생성
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStartEdit}
                data-testid={`button-edit-${sectionDef.key}`}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <Label>키워드</Label>
              <Input
                value={localKeyword}
                onChange={(e) => setLocalKeyword(e.target.value)}
                placeholder="핵심 키워드를 입력하세요"
                data-testid={`input-keyword-${sectionDef.key}`}
              />
            </div>
            <div className="space-y-2">
              <Label>AI 요청사항 (선택)</Label>
              <Input
                value={localRequest}
                onChange={(e) => setLocalRequest(e.target.value)}
                placeholder="AI에게 특별히 요청할 내용이 있다면 입력하세요"
                data-testid={`input-request-${sectionDef.key}`}
              />
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                rows={6}
                placeholder="섹션 내용을 입력하세요"
                data-testid={`textarea-content-${sectionDef.key}`}
              />
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {field?.keyword && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  키워드:
                </span>
                <span className="text-sm bg-primary/10 px-2 py-0.5 rounded">
                  {field.keyword}
                </span>
              </div>
            )}
            <div className="bg-muted p-3 rounded-md min-h-[100px]">
              <p className="text-sm whitespace-pre-wrap">
                {field?.content || "아직 내용이 없습니다. 편집 또는 AI 생성을 사용하세요."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnnualPlanPart1Page() {
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
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);

  const part1Data = annualPlan?.part1 ?? {};

  const isReadyForAuto = useMemo(() => {
    return Array.isArray(extractedPrograms) && extractedPrograms.length > 0;
  }, [extractedPrograms]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/generate-annual-part1", {
        annualPlan,
        programs: extractedPrograms,
      });
      const data = res instanceof Response ? await res.json() : res;
      return data;
    },
    onSuccess: (data: any) => {
      setAnnualPlan(data);
      toast({
        title: "자동 작성 완료",
        description: "PART 1 초안을 생성했습니다.",
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
      const part1 = buildExamplePart1(extractedPrograms);
      const base = annualPlan ?? {
        id: `annual-${Date.now()}`,
        title: `${new Date().getFullYear()}년 연간사업계획`,
        createdAt: new Date().toISOString(),
      };
      const next = {
        ...base,
        part1,
      };
      setAnnualPlan(next);
      toast({
        title: "예시 작성 완료",
        description: "PART 1 전체를 예시 데이터로 채웠습니다.",
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

  const handleUpdateSection = (key: string, field: DraftField) => {
    if (!annualPlan) {
      const base = {
        id: `annual-${Date.now()}`,
        title: `${new Date().getFullYear()}년 연간사업계획`,
        createdAt: new Date().toISOString(),
        part1: { [key]: field },
      };
      setAnnualPlan(base);
    } else {
      updateAnnualPartField("part1", key, field);
    }
  };

  const handleGenerateAISection = async (key: string) => {
    setGeneratingSection(key);
    try {
      const res = await apiRequest("POST", "/api/generate", {
        sectionId: key,
        field: "content",
        context: `섹션: ${PART1_SECTIONS.find((s) => s.key === key)?.title}`,
        programs: extractedPrograms,
      });
      const data = res instanceof Response ? await res.json() : res;

      if (data?.content) {
        const currentField = part1Data[key] ?? { keyword: "", request: "", content: "" };
        handleUpdateSection(key, {
          ...currentField,
          content: data.content,
        });
        toast({
          title: "AI 생성 완료",
          description: `${PART1_SECTIONS.find((s) => s.key === key)?.title} 섹션이 생성되었습니다.`,
        });
      }
    } catch {
      toast({
        title: "AI 생성 실패",
        description: "섹션 생성에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setGeneratingSection(null);
    }
  };

  const goNext = () => {
    setCurrentStep(4);
    navigate("/annual/part2");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-muted-foreground">
              PDF/분류 정보를 바탕으로 초안을 만들고, 섹션별로 수정할 수 있습니다.
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
            {PART1_SECTIONS.map((sec) => (
              <Part1SectionCard
                key={sec.key}
                sectionDef={sec}
                field={part1Data[sec.key]}
                onUpdate={handleUpdateSection}
                onGenerateAI={handleGenerateAISection}
                isGenerating={generatingSection === sec.key}
              />
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">미리보기</h2>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-base">연간사업계획서 PART 1</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {PART1_SECTIONS.map((sec) => {
                  const field = part1Data[sec.key];
                  return (
                    <div key={sec.key} className="space-y-2">
                      <h3 className="font-semibold text-sm">{sec.title}</h3>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap pl-4 border-l-2 border-muted">
                        {field?.content || "(내용 없음)"}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="max-w-7xl mx-auto flex justify-end">
          <Button onClick={goNext} className="gap-2" data-testid="button-next-part2">
            다음 단계 (연간 Part2)
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AnnualPlanPart1Page;
