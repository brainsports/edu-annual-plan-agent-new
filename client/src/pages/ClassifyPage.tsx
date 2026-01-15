import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ClassificationCard } from "@/components/ClassificationCard";
import { ProgramEditDialog } from "@/components/ProgramEditDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAppStore, createInitialAnnualPlan } from "@/lib/store";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import type { ProgramInfo } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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

  const [editingProgram, setEditingProgram] = useState<ProgramInfo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const classifyMutation = useMutation({
    mutationFn: async () => {
      const evaluationFile = uploadedFiles.find((f) => f.type === "evaluation");
      if (!evaluationFile) {
        throw new Error("No evaluation file found");
      }
      
      const response = await apiRequest("POST", "/api/classify", {
        fileId: evaluationFile.id,
      });
      
      return response as ProgramInfo[];
    },
    onSuccess: (data) => {
      setExtractedPrograms(data);
      toast({
        title: "분류 완료",
        description: `${data.length}개의 프로그램 정보가 추출되었습니다.`,
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

  useEffect(() => {
    if (extractedPrograms.length === 0 && uploadedFiles.length > 0) {
      classifyMutation.mutate();
    }
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
    setCurrentStep(3);
    navigate("/annual");
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

        {classifyMutation.isPending ? (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <h2 className="text-lg font-semibold mb-2">AI 분류 중...</h2>
              <p className="text-muted-foreground text-center">
                PDF에서 프로그램 정보를 추출하고 있습니다.<br />
                잠시만 기다려주세요.
              </p>
            </CardContent>
          </Card>
        ) : extractedPrograms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extractedPrograms.map((program) => (
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
              </p>
              <Button onClick={handleReClassify} data-testid="button-classify-empty">
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
            disabled={extractedPrograms.length === 0 || classifyMutation.isPending}
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
