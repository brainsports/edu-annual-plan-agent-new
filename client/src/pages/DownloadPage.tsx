import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { exportDocx } from "@/lib/exportDocx";
import { ArrowLeft, Download } from "lucide-react";
import { useLocation } from "wouter";

function pickFirst<T = any>(obj: any, keys: string[], fallback: T): T {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k] as T;
  }
  return fallback;
}

export function DownloadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const store = useAppStore();

  // ✅ 프로젝트마다 store 필드명이 조금 달라도 깨지지 않게 "후보 키"로 찾습니다.
  // 연간 PART1/2 텍스트(또는 섹션 배열)를 최대한 찾아서 내보냅니다.
  const annualPart1 = pickFirst<any>(
    store,
    [
      "annualPart1",
      "annualPart1Draft",
      "annualPlanPart1",
      "annualPlanPart1Result",
      "generatedAnnualPart1",
      "part1Result",
    ],
    null,
  );

  const annualPart2 = pickFirst<any>(
    store,
    [
      "annualPart2",
      "annualPart2Draft",
      "annualPlanPart2",
      "annualPlanPart2Result",
      "generatedAnnualPart2",
      "part2Result",
    ],
    null,
  );

  // 월간 계획서는 monthlyPlans가 거의 확실히 있음
  const monthlyPlans = pickFirst<any[]>(store, ["monthlyPlans"], []);

  const firstHalf = monthlyPlans
    .filter((p) => p?.month >= 1 && p?.month <= 6)
    .sort((a, b) => a.year - b.year || a.month - b.month);

  const secondHalf = monthlyPlans
    .filter((p) => p?.month >= 7 && p?.month <= 12)
    .sort((a, b) => a.year - b.year || a.month - b.month);

  const toBlocksFromAny = (anyData: any) => {
    // 1) 이미 blocks처럼 만들어둔 경우(배열) → 최대한 살림
    if (Array.isArray(anyData)) {
      // 문자열 배열이면 p로 변환
      if (anyData.every((x) => typeof x === "string")) {
        return anyData.map((t) => ({ type: "p" as const, text: t }));
      }
      // 객체 배열이면 그대로 시도
      return anyData;
    }

    // 2) 문자열이면 줄 단위로 p 만들기
    if (typeof anyData === "string") {
      return anyData
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => ({ type: "p" as const, text: t }));
    }

    // 3) 객체면 JSON으로라도 저장
    if (anyData && typeof anyData === "object") {
      return [{ type: "p" as const, text: JSON.stringify(anyData, null, 2) }];
    }

    return [];
  };

  const toMonthlyBlocks = (plans: any[], titlePrefix: string) => {
    const blocks: any[] = [];
    for (const p of plans) {
      const ym = `${p.year}년 ${p.month}월`;
      blocks.push({ type: "h3", text: `${titlePrefix} - ${ym}` });

      // 각 월 구조가 프로젝트마다 다를 수 있어 안전하게 처리
      const objectives = p.objectives ?? p.goal ?? p.goals ?? "";
      const weeklyTasks = p.weeklyTasks ?? p.weeks ?? p.plan ?? [];

      if (objectives) {
        blocks.push({ type: "h4", text: "목표/핵심 내용" });
        blocks.push({ type: "p", text: String(objectives) });
      }

      if (Array.isArray(weeklyTasks) && weeklyTasks.length > 0) {
        blocks.push({ type: "h4", text: "주간 운영 계획" });
        for (const w of weeklyTasks) {
          const weekNo = w.week ?? w.weekNo ?? "";
          const tasks = w.tasks ?? w.items ?? [];
          if (Array.isArray(tasks)) {
            blocks.push({
              type: "bullets",
              items: tasks.map((t: any) =>
                typeof t === "string" ? t : JSON.stringify(t),
              ),
            });
          } else if (tasks) {
            blocks.push({ type: "p", text: String(tasks) });
          } else {
            blocks.push({ type: "p", text: `주차 ${weekNo}` });
          }
        }
      }

      // 월별 기타 텍스트가 있으면 싹 모아줌
      const extra = p.content ?? p.text ?? p.summary ?? "";
      if (extra) {
        blocks.push({ type: "h4", text: "추가 내용" });
        blocks.push({ type: "p", text: String(extra) });
      }

      blocks.push({ type: "p", text: "" });
    }
    return blocks;
  };

  const warnIfEmpty = (label: string, blocks: any[]) => {
    if (blocks.length === 0) {
      toast({
        title: "내보내기 실패",
        description: `${label}에 내보낼 데이터가 아직 없습니다. 먼저 해당 단계에서 생성 버튼을 눌러주세요.`,
        variant: "destructive",
      });
      return true;
    }
    return false;
  };

  const handleExportAnnualPart1 = async () => {
    const blocks = toBlocksFromAny(annualPart1);
    if (warnIfEmpty("연간 PART1", blocks)) return;
    await exportDocx("연간계획서_PART1.docx", "연간계획서 PART 1", blocks);
  };

  const handleExportAnnualPart2 = async () => {
    const blocks = toBlocksFromAny(annualPart2);
    if (warnIfEmpty("연간 PART2", blocks)) return;
    await exportDocx("연간계획서_PART2.docx", "연간계획서 PART 2", blocks);
  };

  const handleExportMonthlyFirst = async () => {
    const blocks = toMonthlyBlocks(firstHalf, "월간(상반기)");
    if (warnIfEmpty("월간 상반기", blocks)) return;
    await exportDocx(
      "월간계획서_상반기.docx",
      "월간계획서 상반기(1~6월)",
      blocks,
    );
  };

  const handleExportMonthlySecond = async () => {
    const blocks = toMonthlyBlocks(secondHalf, "월간(하반기)");
    if (warnIfEmpty("월간 하반기", blocks)) return;
    await exportDocx(
      "월간계획서_하반기.docx",
      "월간계획서 하반기(7~12월)",
      blocks,
    );
  };

  const handlePrev = () => {
    // 다운로드(7) 이전은 하반기(6)
    store.setCurrentStep?.(6);
    navigate("/monthly/second-half");
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">출력/다운로드</h1>
        <p className="text-muted-foreground mt-1">
          Word(DOCX)로 문서를 내려받을 수 있습니다.
        </p>
      </div>

      <Card>
        <CardContent className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="gap-2" onClick={handleExportAnnualPart1}>
              <Download className="w-4 h-4" />
              연간 PART1 DOCX
            </Button>

            <Button
              className="gap-2"
              onClick={handleExportAnnualPart2}
              variant="secondary"
            >
              <Download className="w-4 h-4" />
              연간 PART2 DOCX
            </Button>

            <Button
              className="gap-2"
              onClick={handleExportMonthlyFirst}
              variant="outline"
            >
              <Download className="w-4 h-4" />
              월간 상반기 DOCX
            </Button>

            <Button
              className="gap-2"
              onClick={handleExportMonthlySecond}
              variant="outline"
            >
              <Download className="w-4 h-4" />
              월간 하반기 DOCX
            </Button>
          </div>

          <div className="mt-6 text-sm text-muted-foreground leading-6">
            <div>
              • 먼저 각 단계에서 생성된 내용이 있어야 DOCX가 만들어집니다.
            </div>
            <div>• 여백은 “좁게” 느낌으로 적용되어 있습니다.</div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 bg-background border-t mt-8 p-4">
        <div className="max-w-5xl mx-auto flex justify-between">
          <Button variant="outline" onClick={handlePrev} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            이전 단계
          </Button>
        </div>
      </div>
    </div>
  );
}
