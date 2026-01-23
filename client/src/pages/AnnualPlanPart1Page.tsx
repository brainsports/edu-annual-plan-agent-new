import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";

import type { DraftField } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ChevronRight, Edit2, Save, X } from "lucide-react";

// ✅ 사업의 필요성 전용 아코디언 입력 UI
import {
  NecessityEditor,
  type NecessityData,
} from "@/components/part1/NecessityEditor";

import { PreviousPdfUploader } from "@/components/part1/PreviousPdfUploader";

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

function buildExamplePart1(
  extractedPrograms: any[],
): Record<string, DraftField> {
  const programNames =
    extractedPrograms?.map((p) => p.programName).filter(Boolean) ?? [];

  return {
    necessity: {
      keyword: "지역의 한계",
      request: "",
      content:
        "1) 이용아동의 욕구 및 문제점\n" +
        "이 사업은 아동의 일상 돌봄과 정서 지원이 동시에 필요하다는 현장 요구를 반영한다.\n" +
        "특히 참여 아동은 생활 환경의 제약으로 인해 안정적인 학습·관계 경험이 부족할 수 있어, 센터의 체계적인 지원이 필요하다.\n\n" +
        "2) 지역 환경적 특성\n" +
        "지역 여건상 돌봄·학습 지원 자원이 제한되어 아동의 성장 지원에 공백이 발생할 수 있다.\n\n" +
        "(1) 지역적 특성\n" +
        "지역의 생활 구조와 접근성 제약으로 인해 아동이 균형 있는 성장 경험을 누리기 어렵다.\n\n" +
        "(2) 주변환경\n" +
        "방과 후 생활 반경에서 안전·문화·학습 공간이 충분하지 않아 보호·지도 공백이 생길 수 있다.\n\n" +
        "(3) 교육적 특성\n" +
        "기초학습 보완과 개별지도가 필요한 아동이 있으나 이를 충분히 지원받기 어려운 상황이 존재한다.\n\n" +
        `본 연간계획은 다음과 같은 프로그램 운영 흐름을 기반으로 구성한다: ${
          programNames.join(", ") || "프로그램 A, 프로그램 B"
        }`,
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

// ✅ necessity 편집용 초기값
const EMPTY_NECESSITY: NecessityData = {
  keywords: {
    childNeeds: ["", "", ""],
    regionSummary: ["", "", ""],
    regionLocal: ["", "", ""],
    regionAround: ["", "", ""],
    regionEdu: ["", "", ""],
  },
  text: {
    childNeeds: "",
    regionSummary: "",
    regionLocal: "",
    regionAround: "",
    regionEdu: "",
  },
};

// ✅ necessity 데이터를 content 텍스트로 합치기
function buildNecessityContent(n: NecessityData) {
  const t = n.text || ({} as NecessityData["text"]);
  const lines: string[] = [];
  lines.push("1) 이용아동의 욕구 및 문제점");
  lines.push((t.childNeeds || "").trim() || "(내용 없음)");
  lines.push("");
  lines.push("2) 지역 환경적 특성");
  lines.push((t.regionSummary || "").trim() || "(요약 없음)");
  lines.push("");
  lines.push("(1) 지역적 특성");
  lines.push((t.regionLocal || "").trim() || "(내용 없음)");
  lines.push("");
  lines.push("(2) 주변환경");
  lines.push((t.regionAround || "").trim() || "(내용 없음)");
  lines.push("");
  lines.push("(3) 교육적 특성");
  lines.push((t.regionEdu || "").trim() || "(내용 없음)");
  return lines.join("\n");
}

// ✅ 기존 content(텍스트)를 necessity 구조로 “대충이라도” 파싱
function parseNecessityFromContent(content?: string): NecessityData {
  const base: NecessityData = JSON.parse(JSON.stringify(EMPTY_NECESSITY));
  if (!content) return base;

  const text = content.replace(/\r\n/g, "\n");

  const getBetween = (start: string, endList: string[]) => {
    const sIdx = text.indexOf(start);
    if (sIdx < 0) return "";
    const after = text.slice(sIdx + start.length);
    let endIdx = after.length;
    for (const end of endList) {
      const i = after.indexOf(end);
      if (i >= 0) endIdx = Math.min(endIdx, i);
    }
    return after.slice(0, endIdx).trim();
  };

  const childNeeds = getBetween("1) 이용아동의 욕구 및 문제점", [
    "2) 지역 환경적 특성",
  ]);
  const regionSummary = getBetween("2) 지역 환경적 특성", [
    "(1) 지역적 특성",
    "(2) 주변환경",
    "(3) 교육적 특성",
  ]);
  const regionLocal = getBetween("(1) 지역적 특성", [
    "(2) 주변환경",
    "(3) 교육적 특성",
  ]);
  const regionAround = getBetween("(2) 주변환경", ["(3) 교육적 특성"]);
  const regionEdu = getBetween("(3) 교육적 특성", []);

  return {
    ...base,
    text: {
      ...base.text,
      childNeeds,
      regionSummary,
      regionLocal,
      regionAround,
      regionEdu,
    },
  };
}

interface Part1SectionCardProps {
  sectionDef: SectionDef;
  field: DraftField | undefined;
  onUpdate: (key: string, field: DraftField) => void;
}

function Part1SectionCard({
  sectionDef,
  field,
  onUpdate,
}: Part1SectionCardProps) {
  const { toast } = useToast();
  const isNecessity = sectionDef.key === "necessity";

  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(field?.content ?? "");

  // ✅ PDF 업로드 파일
  const [previousPdf, setPreviousPdf] = useState<File | null>(null);

  // ✅ 자동 채움 로딩(이 카드 내부에서만 관리)
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  // ✅ necessity 로컬 구조
  const [localNecessity, setLocalNecessity] = useState<NecessityData>(() =>
    parseNecessityFromContent(field?.content),
  );

  useEffect(() => {
    if (!isEditing) {
      setLocalContent(field?.content ?? "");
      if (isNecessity) {
        setLocalNecessity(parseNecessityFromContent(field?.content));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, isEditing]);

  const handleStartEdit = () => {
    setLocalContent(field?.content ?? "");
    if (isNecessity)
      setLocalNecessity(parseNecessityFromContent(field?.content));
    setIsEditing(true);
  };

  const handleSave = () => {
    const nextContent = isNecessity
      ? buildNecessityContent(localNecessity)
      : localContent;

    onUpdate(sectionDef.key, {
      keyword: field?.keyword ?? "",
      request: field?.request ?? "",
      content: nextContent,
    });

    setIsEditing(false);
  };

  const handleCancel = () => setIsEditing(false);

  // ✅ (핵심) PDF 자동 채움: “사업의 필요성” 카드에서만 사용
  const handleAutoFillFromPdf = async () => {
    if (!isNecessity) return;
    if (!previousPdf) {
      toast({
        title: "PDF가 필요합니다.",
        description: "먼저 참고자료(PDF)를 업로드해 주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAutoFillLoading(true);

      const fd = new FormData();
      fd.append("file", previousPdf);

      const res = await fetch("/api/annual/part1/necessity/autofill", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "자동 채움 실패");
      }

      const data = await res.json();

      // ✅ 1) { content: "..." } 형태
      if (data?.content) {
        const next = String(data.content);

        // 편집 UI에도 바로 보이게
        setLocalContent(next);
        setLocalNecessity(parseNecessityFromContent(next));

        // 저장 데이터(미리보기)에도 즉시 반영
        onUpdate("necessity", {
          keyword: field?.keyword ?? "",
          request: field?.request ?? "",
          content: next,
        });

        toast({
          title: "자동 채움 완료",
          description: "PDF 내용을 바탕으로 ‘사업의 필요성’을 채웠습니다.",
        });
        return;
      }

      // ✅ 2) { text: { childNeeds, ... } } 형태 → content로 합쳐 저장
      if (data?.text) {
        const nextNecessity: NecessityData = {
          ...EMPTY_NECESSITY,
          text: {
            ...EMPTY_NECESSITY.text,
            ...(data.text ?? {}),
          },
        };

        const nextContent = buildNecessityContent(nextNecessity);

        setLocalNecessity(nextNecessity);
        setLocalContent(nextContent);

        onUpdate("necessity", {
          keyword: field?.keyword ?? "",
          request: field?.request ?? "",
          content: nextContent,
        });

        toast({
          title: "자동 채움 완료",
          description: "PDF 내용을 바탕으로 ‘사업의 필요성’을 채웠습니다.",
        });
        return;
      }

      throw new Error("서버 응답 형식이 예상과 다릅니다.");
    } catch (e: any) {
      console.error(e);
      toast({
        title: "자동 채움 실패",
        description: e?.message || "자동 채움 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setAutoFillLoading(false);
    }
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
              <Button variant="ghost" size="icon" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSave}>
                <Save className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" onClick={handleStartEdit}>
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            {/* ✅ 전년도 PDF 업로드 + 자동 채움 (사업 필요성에서만 의미 있음) */}
            {isNecessity && (
              <PreviousPdfUploader
                file={previousPdf}
                onChange={setPreviousPdf}
                onAutoFill={handleAutoFillFromPdf}
                autoFillLoading={autoFillLoading}
                autoFillLabel="PDF 내용 자동 채움"
              />
            )}

            {isNecessity ? (
              <div className="space-y-2">
                <Label>내용</Label>
                <NecessityEditor
                  value={localNecessity}
                  onChange={setLocalNecessity}
                />
                <p className="text-xs text-muted-foreground">
                  저장을 누르면 위 입력 내용이 한 번에 정리되어 ‘내용’으로
                  저장됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>내용</Label>
                <Textarea
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  rows={6}
                  placeholder="섹션 내용을 입력하세요"
                />
              </div>
            )}
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
                {field?.content ||
                  "아직 내용이 없습니다. 편집 버튼(연필)을 눌러 작성하세요."}
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

  const [autoWrite, setAutoWrite] = useState(false);

  const handleWrite = async (nextAuto: boolean) => {
    setAutoWrite(nextAuto);

    if (!nextAuto) {
      const part1 = buildExamplePart1(extractedPrograms);
      const base = annualPlan ?? {
        id: `annual-${Date.now()}`,
        title: `${new Date().getFullYear()}년 연간사업계획`,
        createdAt: new Date().toISOString(),
      };
      setAnnualPlan({ ...base, part1 });

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

  const goNext = () => {
    setCurrentStep(4);
    navigate("/annual/part2");
  };

  return (
    <div className="flex flex-col h-full">
      {/* ✅ 상단 안내 + 버튼 */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              PDF/분류 정보를 바탕으로 초안을 만들고, 섹션별로 수정할 수
              있습니다.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              추출된 프로그램 정보: {extractedPrograms?.length ?? 0}개
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={!autoWrite ? "default" : "outline"}
              size="sm"
              onClick={() => handleWrite(false)}
              disabled={generateMutation.isPending}
            >
              예시 작성
            </Button>

            <Button
              variant={autoWrite ? "default" : "outline"}
              size="sm"
              onClick={() => handleWrite(true)}
              disabled={generateMutation.isPending}
              className="gap-1"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-xs">AI</span>
              )}
              자동 작성
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 좌측: 입력/편집 */}
          <div className="space-y-4">
            {PART1_SECTIONS.map((sec) => (
              <Part1SectionCard
                key={sec.key}
                sectionDef={sec}
                field={(part1Data as any)[sec.key]}
                onUpdate={handleUpdateSection}
              />
            ))}
          </div>

          {/* 우측: 미리보기 */}
          <div className="space-y-4">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">
                  연간사업계획서 PART 1
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {PART1_SECTIONS.map((sec) => {
                  const field = (part1Data as any)[sec.key] as
                    | DraftField
                    | undefined;
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
          <Button onClick={goNext} className="gap-2">
            다음 단계 (연간 Part2)
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AnnualPlanPart1Page;
