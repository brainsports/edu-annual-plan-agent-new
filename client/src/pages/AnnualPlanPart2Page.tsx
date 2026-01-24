import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import type { DraftField } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import {
  ChevronRight,
  ChevronLeft,
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

interface H4ItemCardProps {
  h3Key: string;
  h4Cat: { key: string; title: string };
  field: DraftField | undefined;
  onUpdate: (fullKey: string, field: DraftField) => void;
}

/**
 * ✅ Part1 컨셉 적용
 * - 보기/편집 분기 제거
 * - 연필/저장/취소 제거
 * - 진입 즉시 “작성 화면”만 노출
 * - 입력 변경 시 즉시 store 반영
 * - AI 요청사항/AI 버튼/로직 전부 제거
 */
function H4ItemCard({ h3Key, h4Cat, field, onUpdate }: H4ItemCardProps) {
  const fullKey = `${h3Key}_${h4Cat.key}`;

  const [localKeyword, setLocalKeyword] = useState(field?.keyword ?? "");
  const [localContent, setLocalContent] = useState(field?.content ?? "");

  // store 값이 바뀌면(다른 경로에서 수정되었을 때) 입력창 동기화
  useEffect(() => {
    setLocalKeyword(field?.keyword ?? "");
    setLocalContent(field?.content ?? "");
  }, [field?.keyword, field?.content]);

  const commit = (next: Partial<DraftField>) => {
    const merged: DraftField = {
      keyword: next.keyword ?? localKeyword ?? "",
      request: "", // ✅ Part2에서는 request(=AI요청) 사용 안 함
      content: next.content ?? localContent ?? "",
    };
    onUpdate(fullKey, merged);
  };

  const commitKeyword = (next: string) => {
    setLocalKeyword(next);
    commit({ keyword: next });
  };

  const commitContent = (next: string) => {
    setLocalContent(next);
    commit({ content: next });
  };

  return (
    <div
      className="border rounded-md p-3 bg-muted/30"
      data-testid={`card-h4-${fullKey}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm font-medium">{h4Cat.title}</h4>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">키워드</Label>
          <Input
            value={localKeyword}
            onChange={(e) => commitKeyword(e.target.value)}
            placeholder="핵심 키워드"
            className="h-8 text-sm"
            data-testid={`input-keyword-${fullKey}`}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">내용</Label>
          <Textarea
            value={localContent}
            onChange={(e) => commitContent(e.target.value)}
            rows={4}
            placeholder="내용을 입력하세요"
            className="text-sm"
            data-testid={`textarea-content-${fullKey}`}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          입력 내용은 자동으로 저장되고, 우측 미리보기에 즉시 반영됩니다.
        </p>
      </div>
    </div>
  );
}

interface H3SectionCardProps {
  section: { key: string; title: string; description: string };
  part2Data: Record<string, DraftField>;
  onUpdate: (fullKey: string, field: DraftField) => void;
}

/**
 * ✅ Part1 컨셉 적용
 * - “전체 AI 생성” 제거
 * - 섹션은 접기/펼치기만 유지
 */
function H3SectionCard({ section, part2Data, onUpdate }: H3SectionCardProps) {
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

  const {
    extractedPrograms,
    annualPlan,
    setAnnualPlan,
    updateAnnualPartField,
    setCurrentStep,
  } = useAppStore();

  // annualPlan이 없을 때도 바로 작성 가능하도록 안전 베이스
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

  const handleUpdateField = (fullKey: string, field: DraftField) => {
    if (!annualPlan) {
      setAnnualPlan({
        ...safePlan,
        part2: { ...(safePlan.part2 ?? {}), [fullKey]: field },
      });
    } else {
      updateAnnualPartField("part2", fullKey, field);
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
      <div className="flex-1 space-y-6 pt-4">
        <div className="grid grid-cols-1 xl:grid-cols-[3fr_5fr] gap-6 items-start">
          {/* ✅ 좌측: 작성화면만 */}
          <div className="space-y-4">
            {H3_SECTIONS.map((section) => (
              <H3SectionCard
                key={section.key}
                section={section}
                part2Data={part2Data}
                onUpdate={handleUpdateField}
              />
            ))}
          </div>

          {/* ✅ 우측: 미리보기 유지 */}
          <div className="space-y-4">
            <Card className="sticky top-24">
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
                        const f = part2Data[fullKey];
                        return (
                          <div key={fullKey} className="space-y-1">
                            <h4 className="text-xs font-medium text-muted-foreground">
                              {cat.title}
                            </h4>
                            <div className="text-sm whitespace-pre-wrap pl-3 border-l-2 border-muted">
                              {f?.content || "(내용 없음)"}
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

      {/* ✅ 하단 이전/다음 유지 */}
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
