import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";

import type { AnnualPlan } from "../../../shared/schema";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Loader2 } from "lucide-react";

// ✅ 예시 데이터 생성 함수(파트1 전체를 한 번에 채움)
function buildExamplePart1(extractedPrograms: any[]) {
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

export function AnnualPlanPart1Page() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { extractedPrograms, annualPlan, setAnnualPlan, setCurrentStep } =
    useAppStore();

  // ✅ 스위치: false=예시 작성 / true=자동 작성
  const [autoWrite, setAutoWrite] = useState(false);

  const isReadyForAuto = useMemo(() => {
    // 최소 조건: 분류 프로그램이 있어야 함 (PDF 기반까지 붙이면 pdfText/fileId 조건도 추가)
    return Array.isArray(extractedPrograms) && extractedPrograms.length > 0;
  }, [extractedPrograms]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      // ⚠️ 여기서 “업로드 파일 기반(PDF)”을 쓰려면
      // server가 fileId 또는 pdfText를 받을 수 있어야 합니다.
      // 현재는 annualPlan + programs만 보내는 구조일 가능성이 큽니다.
      const res = await apiRequest("POST", "/api/generate-annual-part1", {
        annualPlan,
        programs: extractedPrograms,
        // TODO(권장): fileId 또는 pdfText를 함께 전달
        // fileId,
        // pdfText,
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
    // 스위치 상태 변경
    setAutoWrite(nextAuto);

    if (!nextAuto) {
      // ✅ 예시 작성
      const part1 = buildExamplePart1(extractedPrograms);
      const next = {
        ...annualPlan,
        part1,
      };
      setAnnualPlan(next);
      toast({
        title: "예시 작성 완료",
        description: "PART 1 전체를 예시 데이터로 채웠습니다.",
      });
      return;
    }

    // ✅ 자동 작성
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

  const goNext = () => {
    setCurrentStep(4);
    navigate("/annual/part2");
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col">
      <div className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">연간 PART 1</h1>
            <p className="text-muted-foreground mt-1">
              PDF/분류 정보를 바탕으로 Part1 초안을 만들고, 섹션별로 수정할 수
              있습니다.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              추출된 프로그램 정보: {extractedPrograms?.length ?? 0}개
            </p>
          </div>

          {/* ✅ 스위치 영역 */}
          <div className="flex items-center gap-3">
            <span
              className={!autoWrite ? "font-semibold" : "text-muted-foreground"}
            >
              예시 작성
            </span>

            <Switch
              checked={autoWrite}
              onCheckedChange={(v) => handleWrite(v)}
              disabled={generateMutation.isPending}
            />

            <span
              className={autoWrite ? "font-semibold" : "text-muted-foreground"}
            >
              자동 작성
            </span>

            {generateMutation.isPending && (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                생성 중
              </span>
            )}
          </div>
        </div>

        {/* (여기 아래는 기존 섹션 UI 그대로 유지) */}
        {/* ... AnnualPlanSection 들 ... */}
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="max-w-6xl mx-auto flex justify-end">
          <Button onClick={goNext} className="gap-2">
            다음 단계(연간 Part2)
            <Sparkles className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AnnualPlanPart1Page;
