import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import type { DraftField } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { ChevronRight, Loader2 } from "lucide-react";

// ✅ NecessityEditor는 default export인 경우가 많아 안전하게 default import 사용
import NecessityEditor, {
  type NecessityData,
} from "@/components/part1/NecessityEditor";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PreviousPdfUploader } from "@/components/part1/PreviousPdfUploader";

interface SectionDef {
  key: Part1Key;
  title: string;
  description: string;
}

type Part1Key =
  | "necessity"
  | "evaluationAndFeedback"
  | "satisfaction"
  | "purpose"
  | "goals";

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

/**
 * ✅ necessity 상태(keywords/text)를 DraftField.request에 JSON으로 저장
 */
function encodeNecessityToRequest(n: NecessityData) {
  try {
    return JSON.stringify({
      v: 1,
      keywords: n.keywords,
      text: n.text,
    });
  } catch {
    return "";
  }
}

function decodeNecessityFromRequest(request?: string): NecessityData | null {
  if (!request) return null;
  try {
    const obj = JSON.parse(request);
    if (!obj) return null;
    return {
      ...EMPTY_NECESSITY,
      keywords: {
        ...EMPTY_NECESSITY.keywords,
        ...(obj.keywords ?? {}),
      },
      text: {
        ...EMPTY_NECESSITY.text,
        ...(obj.text ?? {}),
      },
    };
  } catch {
    return null;
  }
}

type MaybeKeywordBlock =
  | string[]
  | { keywords?: string[]; content?: string }
  | null
  | undefined;

type AutofillResponse = {
  content?: string;
  text?: Partial<NecessityData["text"]>;
  keywords?: {
    needs?: MaybeKeywordBlock;
    region?: MaybeKeywordBlock;
    regionSummary?: MaybeKeywordBlock;
  };
  fields?: Record<
    string,
    {
      content?: string;
      keywords?: string[];
    }
  >;
};

// ✅ 다양한 형태의 키워드 응답을 "string[]"로 안전 변환
function extractKeywords(x: MaybeKeywordBlock): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === "object" && Array.isArray((x as any).keywords))
    return (x as any).keywords;
  return [];
}

// ✅ 항상 3칸을 보장(빈칸 포함)
function fill3(arr?: string[]) {
  const cleaned = (arr ?? []).filter(Boolean).slice(0, 3);
  while (cleaned.length < 3) cleaned.push("");
  return cleaned;
}

// ✅ 서버 응답을 NecessityData로 최대한 안정적으로 변환
function mergeNecessityFromAutofill(data: AutofillResponse): NecessityData {
  const base: NecessityData = JSON.parse(JSON.stringify(EMPTY_NECESSITY));

  // 1) content가 있으면 텍스트 파싱
  let fromContent: NecessityData | null = null;
  if (data?.content) {
    fromContent = parseNecessityFromContent(String(data.content));
  }

  // 2) fields.*.content도 text로 흡수 (서버가 이렇게 줄 때가 많음)
  const fieldsText: Partial<NecessityData["text"]> = {
    childNeeds: data?.fields?.needsProblem?.content ?? "",
    regionSummary: data?.fields?.regionSummary?.content ?? "",
    regionLocal: data?.fields?.regionLocal?.content ?? "",
    regionAround: data?.fields?.regionAround?.content ?? "",
    regionEdu: data?.fields?.regionEdu?.content ?? "",
  };

  // 3) text 우선순위: base < fromContent < data.text < fieldsText
  const textMerged: NecessityData["text"] = {
    ...base.text,
    ...(fromContent?.text ?? {}),
    ...(data?.text ?? {}),
    ...fieldsText,
  };

  // 4) keywords 매핑
  const kNeeds = fill3(
    data?.fields?.needsProblem?.keywords ??
      extractKeywords(data?.keywords?.needs) ??
      fromContent?.keywords?.childNeeds ??
      [],
  );

  const kRegionSummaryRaw =
    data?.fields?.regionSummary?.keywords ??
    extractKeywords(data?.keywords?.regionSummary) ??
    extractKeywords(data?.keywords?.region) ??
    fromContent?.keywords?.regionSummary ??
    [];

  const summary3 = fill3(kRegionSummaryRaw);

  const local3 = fill3(
    data?.fields?.regionLocal?.keywords ??
      fromContent?.keywords?.regionLocal ??
      [],
  );
  const around3 = fill3(
    data?.fields?.regionAround?.keywords ??
      fromContent?.keywords?.regionAround ??
      [],
  );
  const edu3 = fill3(
    data?.fields?.regionEdu?.keywords ?? fromContent?.keywords?.regionEdu ?? [],
  );

  // 5) ✅ text가 비면 "키워드로 임시 요약"을 만들어서 미리보기에 최소한 보이게 함
  const ensureText = (val: string, keys: string[], label: string) => {
    const trimmed = (val || "").trim();
    if (trimmed) return trimmed;
    const joined = keys.filter(Boolean).join(", ");
    return joined ? `키워드 기반 요약: ${joined}` : `(내용 없음)`;
  };

  const merged: NecessityData = {
    ...base,
    text: {
      childNeeds: ensureText(
        textMerged.childNeeds || "",
        kNeeds,
        "욕구/문제점",
      ),
      regionSummary: ensureText(
        textMerged.regionSummary || "",
        summary3,
        "지역요약",
      ),
      regionLocal: ensureText(
        textMerged.regionLocal || "",
        local3.some(Boolean) ? local3 : summary3,
        "지역적 특성",
      ),
      regionAround: ensureText(
        textMerged.regionAround || "",
        around3.some(Boolean) ? around3 : summary3,
        "주변환경",
      ),
      regionEdu: ensureText(
        textMerged.regionEdu || "",
        edu3.some(Boolean) ? edu3 : summary3,
        "교육적 특성",
      ),
    },
    keywords: {
      ...base.keywords,
      childNeeds: kNeeds,
      regionSummary: summary3,
      regionLocal: local3.some(Boolean) ? local3 : summary3,
      regionAround: around3.some(Boolean) ? around3 : summary3,
      regionEdu: edu3.some(Boolean) ? edu3 : summary3,
    },
  };

  return merged;
}

/** ✅ 미리보기 제목/내용 헬퍼 */
function getSectionDef(key: Part1Key) {
  return PART1_SECTIONS.find((s) => s.key === key);
}

function getPreviewContent(params: {
  key: Part1Key;
  part1Data: any;
  necessityPreviewEnabled: boolean;
}) {
  const { key, part1Data, necessityPreviewEnabled } = params;

  // ✅ 1. 필요성은 문서생성하기 전까지 “절대” 내용 안 보이게
  if (key === "necessity") {
    if (!necessityPreviewEnabled) return null;
    return part1Data?.necessity?.content || "";
  }

  return part1Data?.[key]?.content || "";
}

interface Part1SectionCardProps {
  sectionDef: SectionDef;
  field: DraftField | undefined;
  onUpdate: (key: Part1Key, field: DraftField) => void;
  onAfterBuildNecessity?: () => void; // ✅ 문서생성 이후 추가 동작(탭 이동 등)
  isPreviewEnabled?: boolean;
}

function Part1SectionCard({
  sectionDef,
  field,
  onUpdate,
  onAfterBuildNecessity,
  isPreviewEnabled,
}: Part1SectionCardProps) {
  const { toast } = useToast();
  const isNecessity = sectionDef.key === "necessity";

  const [previousPdf, setPreviousPdf] = useState<File | null>(null);
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  const [localContent, setLocalContent] = useState(field?.content ?? "");

  const [localNecessity, setLocalNecessity] = useState<NecessityData>(() => {
    const fromReq = decodeNecessityFromRequest(field?.request);
    if (fromReq) return fromReq;
    return parseNecessityFromContent(field?.content);
  });

  useEffect(() => {
    setLocalContent(field?.content ?? "");
    if (isNecessity) {
      const fromReq = decodeNecessityFromRequest(field?.request);
      setLocalNecessity(fromReq ?? parseNecessityFromContent(field?.content));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field?.content, field?.request, isNecessity]);

  const commitText = (next: string) => {
    setLocalContent(next);
    onUpdate(sectionDef.key, {
      keyword: field?.keyword ?? "",
      request: field?.request ?? "",
      content: next,
    });
  };

  // ✅ necessity는 입력 변경 시 로컬로만 저장
  const stageNecessity = (nextNecessity: NecessityData) => {
    setLocalNecessity(nextNecessity);
  };

  // ✅ 문서생성하기: 서버에서 5개 항목(각 300~500자) 생성 → store 반영 → 미리보기 ON
  const handleBuildDocument = async () => {
    try {
      setAutoFillLoading(true);

      const payload = {
        keywords: {
          childNeeds: localNecessity.keywords.childNeeds,
          regionSummary: localNecessity.keywords.regionSummary,
          regionLocal: localNecessity.keywords.regionLocal,
          regionAround: localNecessity.keywords.regionAround,
          regionEdu: localNecessity.keywords.regionEdu,
        },
        // baseText가 있다면 같이 보냄(없으면 제거해도 됨)
        // baseText: localNecessity.baseText ?? "",
      };

      const res = await fetch("/api/annual/part1/necessity/generate5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(async () => {
        const t = await res.text();
        throw new Error(t || "서버 응답 파싱 실패");
      });

      // ✅ HTTP 실패 or ok:false 모두 잡기
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "문서 생성 실패(generate5)");
      }

      const fields = data.fields || {};

      // ✅ 핵심: textarea가 바라보는 state에 직접 주입
      const nextNecessity = {
        ...localNecessity,
        text: {
          ...localNecessity.text,
          childNeeds: fields.childNeeds ?? fields.needsProblem ?? "",
          regionSummary: fields.regionSummary ?? "",
          regionLocal: fields.regionLocal ?? "",
          regionAround: fields.regionAround ?? "",
          regionEdu: fields.regionEdu ?? "",
        },
      };

      setLocalNecessity(nextNecessity);

      // store에도 반영하는 코드가 있다면 여기서 같이 호출(프로젝트에 이미 있을 가능성 큼)
      // setAnnualPart1Necessity(nextNecessity);
      // setIsPreviewEnabled(true);
    } catch (e: any) {
      console.error("handleBuildDocument failed:", e);
      // toast 처리 로직이 있으면 그대로 사용
      // toast({ title: "생성 실패", description: e?.message ?? "generate_failed" });
    } finally {
      setAutoFillLoading(false);
    }
  };

  // ✅ PDF 자동 채움: 서버 키워드를 localNecessity.keywords까지 주입
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

      const data = (await res.json()) as AutofillResponse;
      const nextNecessity = mergeNecessityFromAutofill(data);

      // ✅ 화면에 키워드 즉시 표시
      setLocalNecessity(nextNecessity);

      // ✅ 자동채움 결과를 request에 저장(미리보기는 아직 OFF)
      onUpdate("necessity", {
        keyword: field?.keyword ?? "",
        request: encodeNecessityToRequest(nextNecessity),
        content: field?.content ?? "",
      });

      toast({
        title: "키워드 자동 채움 완료",
        description:
          "키워드를 채웠습니다. 아래에서 ‘문서생성하기’를 눌러 미리보기에 반영하세요.",
      });
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
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-base">{sectionDef.title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {sectionDef.description}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isNecessity && (
          <PreviousPdfUploader
            file={previousPdf}
            onChange={setPreviousPdf}
            onAutoFill={handleAutoFillFromPdf}
            autoFillLoading={autoFillLoading}
            autoFillLabel="PDF 키워드 자동 채움"
          />
        )}

        {isNecessity ? (
          <div className="space-y-2">
            <Label>내용</Label>

            <NecessityEditor value={localNecessity} onChange={stageNecessity} />

            <div className="pt-2">
              <Button
                className="w-full"
                onClick={handleBuildDocument}
                disabled={autoFillLoading}
              >
                {autoFillLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    처리 중
                  </>
                ) : (
                  "문서생성하기"
                )}
              </Button>

              {!isPreviewEnabled && (
                <p className="text-xs text-muted-foreground mt-2">
                  ‘문서생성하기’를 누르면 오른쪽에 미리보기가 표시됩니다.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>내용</Label>
            <Textarea
              value={localContent}
              onChange={(e) => commitText(e.target.value)}
              rows={6}
              placeholder="섹션 내용을 입력하세요"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnnualPlanPart1Page() {
  const [, navigate] = useLocation();

  const { annualPlan, setAnnualPlan, updateAnnualPartField, setCurrentStep } =
    useAppStore();

  const part1Data = annualPlan?.part1 ?? {};

  // ✅ necessity 미리보기 표시 여부(문서생성하기 버튼으로 켬)
  const [necessityPreviewEnabled, setNecessityPreviewEnabled] = useState(false);

  // ✅ 미리보기 탭 상태(기본: 1. 필요성)
  const [previewTab, setPreviewTab] = useState<Part1Key>("necessity");

  // ✅ part1Data가 바뀌어도 탭 유지 (특별 처리 없음)
  const previewSectionDef = useMemo(
    () => getSectionDef(previewTab),
    [previewTab],
  );

  const handleUpdateSection = (key: Part1Key, field: DraftField) => {
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

  // ✅ 미리보기 내용
  const previewContent = useMemo(() => {
    return getPreviewContent({
      key: previewTab,
      part1Data,
      necessityPreviewEnabled,
    });
  }, [previewTab, part1Data, necessityPreviewEnabled]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6 pt-4">
        <div className="grid grid-cols-1 xl:grid-cols-[3fr_5fr] gap-6">
          {/* ✅ 좌측: 작성 */}
          <div className="space-y-4 min-w-0">
            {PART1_SECTIONS.map((sec) => (
              <Part1SectionCard
                key={sec.key}
                sectionDef={sec}
                field={(part1Data as any)[sec.key]}
                onUpdate={handleUpdateSection}
                isPreviewEnabled={
                  sec.key === "necessity" ? necessityPreviewEnabled : true
                }
                onAfterBuildNecessity={() => {
                  // ✅ 1~5단계 중 “할 수 있는 것”까지 한 번에:
                  // 1) 필요성 미리보기 ON
                  setNecessityPreviewEnabled(true);
                  // 2) 미리보기 탭을 1. 필요성으로 자동 이동
                  setPreviewTab("necessity");
                }}
              />
            ))}
          </div>

          {/* ✅ 우측: 미리보기 */}
          <div className="space-y-4 min-w-0">
            <div className="w-full">
              <Card className="sticky top-24 w-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    연간사업계획서 PART 1
                  </CardTitle>

                  {/* ✅ 미리보기 탭 UI */}
                  <div className="mt-3">
                    <Tabs
                      value={previewTab}
                      onValueChange={(v) => setPreviewTab(v as Part1Key)}
                    >
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="necessity">1. 필요성</TabsTrigger>
                        <TabsTrigger value="evaluationAndFeedback">
                          2. 평가/환류
                        </TabsTrigger>
                        <TabsTrigger value="satisfaction">
                          3. 만족도
                        </TabsTrigger>
                        <TabsTrigger value="purpose">4. 목적</TabsTrigger>
                        <TabsTrigger value="goals">5. 목표</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>

                {/* ✅ 선택한 탭 1개만 미리보기 표시 */}
                <CardContent className="px-10 py-10">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">
                      {previewSectionDef?.title || "미리보기"}
                    </h3>

                    {/* ✅ 1. 필요성: 문서생성하기 전엔 안내문만 */}
                    {previewTab === "necessity" && !necessityPreviewEnabled ? (
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap pl-4 border-l-2 border-muted">
                        (왼쪽에서 키워드를 확인한 뒤 ‘문서생성하기’를 누르면
                        표시됩니다.)
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap pl-4 border-l-2 border-muted">
                        {previewContent || "(내용 없음)"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="w-full flex justify-end">
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
