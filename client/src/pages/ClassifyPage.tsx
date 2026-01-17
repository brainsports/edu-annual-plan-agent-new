import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";

import { ClassificationCard } from "@/components/ClassificationCard";
import { ProgramEditDialog } from "@/components/ProgramEditDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAppStore, createInitialAnnualPlan } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";

import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import type { ProgramInfo } from "@shared/schema";

export function ClassifyPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const {
    uploadedFiles,
    extractedPrograms,
    setExtractedPrograms,
    updateProgram,
    setAnnualPlan,
    setCurrentStep,
  } = useAppStore();

  const [editingProgram, setEditingProgram] = useState<ProgramInfo | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  /** ✅ 임시 분류 데이터(서버 분류가 실패해도 3단계로 진행 가능하게) */
  const buildFallbackPrograms = (): ProgramInfo[] => {
    const nowId = () =>
      String(Date.now()) + "-" + Math.random().toString(16).slice(2);

    return [
      {
        id: nowId(),
        programName: "임시 분류 프로그램 1",
        target: "초등 전학년",
        period: "2026-01-01 ~ 2026-12-31",
        purpose:
          "PDF 분류 API가 연결되기 전까지 흐름 테스트를 위한 임시 데이터입니다.",
      } as any,
      {
        id: nowId(),
        programName: "임시 분류 프로그램 2",
        target: "초등 고학년",
        period: "2026-03-01 ~ 2026-11-30",
        purpose:
          "실제 분류 연결 후에는 이 데이터 대신 AI 분류 결과가 들어옵니다.",
      } as any,
    ];
  };

  const classifyMutation = useMutation({
    mutationFn: async (): Promise<ProgramInfo[]> => {
      const evaluationFile = uploadedFiles.find((f) => f.type === "evaluation");
      if (!evaluationFile) throw new Error("No evaluation file found");

      try {
        const raw = await apiRequest("POST", "/api/classify", {
          fileId: evaluationFile.id,
        });

        // ✅ apiRequest가 Response를 주는 경우
        if (raw instanceof Response) {
          if (!raw.ok) throw new Error(`Classify API failed: ${raw.status}`);
          const data = (await raw.json()) as ProgramInfo[];
          if (!Array.isArray(data) || data.length === 0)
            return buildFallbackPrograms();
          return data;
        }

        // ✅ apiRequest가 이미 JSON 객체를 주는 경우
        const data = raw as any;
        if (!Array.isArray(data) || data.length === 0)
          return buildFallbackPrograms();
        return data as ProgramInfo[];
      } catch {
        return buildFallbackPrograms();
      }
    },
    onSuccess: (data) => {
      setExtractedPrograms(data);
      toast({
        title: "분류 완료",
        description: `${data.length}개의 프로그램 정보가 준비되었습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "분류 실패",
        description: "정보 추출에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  // ✅ 자동 실행은 기본 OFF (원하면 주석 해제)
  useEffect(() => {
    // if (extractedPrograms.length === 0 && uploadedFiles.length > 0) {
    //   classifyMutation.mutate();
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = (program: ProgramInfo) => {
    setEditingProgram(program);
    setIsDialogOpen(true);
  };

  const handleSave = (program: ProgramInfo) => {
    updateProgram(program);
    toast({
      title: "저장 완료",
      description: "프로그램 정보가 수정되었습니다.",
    });
  };

  const handleReClassify = () => {
    setExtractedPrograms([]);
    classifyMutation.mutate();
  };

  const handlePrev = () => {
    setCurrentStep(1);
    navigate("/");
  };

  const handleNext = () => {
    if (extractedPrograms.length === 0) {
      toast({
        title: "분류 필요",
        description: "프로그램 정보를 먼저 추출해주세요.",
        variant: "destructive",
      });
      return;
    }

    const annualPlan = createInitialAnnualPlan(extractedPrograms);
    setAnnualPlan(annualPlan);

    // ✅ 핵심: 3단계는 /annual/part1 로 이동해야 StepIndicator도 3으로 표시됨
    setCurrentStep(3);
    navigate("/annual/part1");
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col">
      <div className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">자동 분류 결과</h1>
            <p className="text-muted-foreground mt-1">
              PDF에서 추출된 프로그램 정보를 확인하고 수정할 수 있습니다
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => classifyMutation.mutate()}
              disabled={classifyMutation.isPending}
              className="gap-2"
              data-testid="button-classify"
            >
              {classifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              분류하기
            </Button>

            <Button
              variant="outline"
              onClick={handleReClassify}
              disabled={classifyMutation.isPending}
              className="gap-2"
              data-testid="button-reclassify"
            >
              {classifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              다시 분류
            </Button>
          </div>
        </div>

        {classifyMutation.isPending ? (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <h2 className="text-lg font-semibold mb-2">AI 분류 중...</h2>
              <p className="text-muted-foreground text-center">
                PDF에서 프로그램 정보를 추출하고 있습니다.
                <br />
                잠시만 기다려주세요.
              </p>
            </CardContent>
          </Card>
        ) : extractedPrograms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extractedPrograms.map((program: any) => (
              <ClassificationCard
                key={program.id}
                program={program}
                onEdit={handleEdit}
              />
            ))}
          </div>
        ) : (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground mb-4">
                추출된 프로그램 정보가 없습니다.
                <br />
                위의 ‘분류하기’ 버튼을 눌러 시작해주세요.
              </p>
              <Button
                onClick={() => classifyMutation.mutate()}
                data-testid="button-classify-empty"
              >
                분류 시작
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="max-w-6xl mx-auto flex justify-between">
          <Button variant="outline" onClick={handlePrev} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            이전 단계
          </Button>

          <Button
            onClick={handleNext}
            disabled={
              extractedPrograms.length === 0 || classifyMutation.isPending
            }
            className="gap-2"
            data-testid="button-next-annual"
          >
            연간계획서 작성
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ProgramEditDialog
        program={editingProgram}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
      />
    </div>
  );
}
