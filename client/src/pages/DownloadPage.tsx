import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import {
  exportPart1Docx,
  exportPart2Docx,
  exportFirstHalfMonthlyDocx,
  exportSecondHalfMonthlyDocx,
} from "@/lib/exportDocx";
import { ArrowLeft, Download, FileText, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";

interface DownloadItem {
  id: string;
  title: string;
  description: string;
  hasData: boolean;
  onDownload: () => Promise<void>;
}

export function DownloadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { annualPlan, monthlyPlans, extractedPrograms, setCurrentStep } = useAppStore();

  const hasP1 = useMemo(() => {
    if (!annualPlan?.part1) return false;
    return Object.values(annualPlan.part1).some((f) => f.content?.trim());
  }, [annualPlan]);

  const hasP2 = useMemo(() => {
    if (!annualPlan?.part2) return false;
    return Object.values(annualPlan.part2).some((f) => f.content?.trim());
  }, [annualPlan]);

  const hasFirstHalf = useMemo(() => {
    const plans = monthlyPlans.filter((p) => p.month >= 1 && p.month <= 6);
    return plans.some((p) => {
      const hasObjectives = p.objectives && p.objectives.length > 2;
      const hasWeeklyTasks = p.weeklyTasks?.some(
        (w) => Array.isArray(w.tasks) && w.tasks.length > 0
      );
      return hasObjectives || hasWeeklyTasks;
    });
  }, [monthlyPlans]);

  const hasSecondHalf = useMemo(() => {
    const plans = monthlyPlans.filter((p) => p.month >= 7 && p.month <= 12);
    return plans.some((p) => {
      const hasObjectives = p.objectives && p.objectives.length > 2;
      const hasWeeklyTasks = p.weeklyTasks?.some(
        (w) => Array.isArray(w.tasks) && w.tasks.length > 0
      );
      return hasObjectives || hasWeeklyTasks;
    });
  }, [monthlyPlans]);

  const handleExportPart1 = async () => {
    try {
      await exportPart1Docx(annualPlan);
      toast({
        title: "다운로드 완료",
        description: "연간계획서 PART 1이 다운로드되었습니다.",
      });
    } catch (err: any) {
      toast({
        title: "다운로드 실패",
        description: err.message || "PART 1 파일 생성에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleExportPart2 = async () => {
    try {
      await exportPart2Docx(annualPlan);
      toast({
        title: "다운로드 완료",
        description: "연간계획서 PART 2가 다운로드되었습니다.",
      });
    } catch (err: any) {
      toast({
        title: "다운로드 실패",
        description: err.message || "PART 2 파일 생성에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleExportFirstHalf = async () => {
    try {
      await exportFirstHalfMonthlyDocx(monthlyPlans, extractedPrograms);
      toast({
        title: "다운로드 완료",
        description: "상반기 월간계획서가 다운로드되었습니다.",
      });
    } catch (err: any) {
      toast({
        title: "다운로드 실패",
        description: err.message || "상반기 파일 생성에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleExportSecondHalf = async () => {
    try {
      await exportSecondHalfMonthlyDocx(monthlyPlans, extractedPrograms);
      toast({
        title: "다운로드 완료",
        description: "하반기 월간계획서가 다운로드되었습니다.",
      });
    } catch (err: any) {
      toast({
        title: "다운로드 실패",
        description: err.message || "하반기 파일 생성에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const downloadItems: DownloadItem[] = [
    {
      id: "part1",
      title: "연간사업계획서 PART 1",
      description: "사업의 필요성, 평가 및 환류, 만족도, 사업목적, 사업목표",
      hasData: hasP1,
      onDownload: handleExportPart1,
    },
    {
      id: "part2",
      title: "연간사업계획서 PART 2",
      description: "세부사업내용, 평가계획 (5개 프로그램 분류)",
      hasData: hasP2,
      onDownload: handleExportPart2,
    },
    {
      id: "first-half",
      title: "상반기 월간계획",
      description: "1월~6월 월별 사업계획서",
      hasData: hasFirstHalf,
      onDownload: handleExportFirstHalf,
    },
    {
      id: "second-half",
      title: "하반기 월간계획",
      description: "7월~12월 월별 사업계획서",
      hasData: hasSecondHalf,
      onDownload: handleExportSecondHalf,
    },
  ];

  const handlePrev = () => {
    setCurrentStep(6);
    navigate("/monthly/second-half");
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        <div className="mb-8">
          <h1
            className="text-2xl md:text-3xl font-bold"
            data-testid="heading-download"
          >
            문서 다운로드
          </h1>
          <p className="text-muted-foreground mt-1">
            작성한 계획서를 Word(.docx) 파일로 다운로드합니다.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              다운로드 가능한 문서
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {downloadItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg"
                data-testid={`download-item-${item.id}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                      item.hasData
                        ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.hasData ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.description}
                    </div>
                    {!item.hasData && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        작성된 내용이 없습니다
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant={item.hasData ? "default" : "outline"}
                  size="sm"
                  onClick={item.onDownload}
                  disabled={!item.hasData}
                  className="gap-2 shrink-0"
                  data-testid={`button-download-${item.id}`}
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            • 각 문서는 <strong>개별 다운로드</strong>됩니다. (총 4개 파일)
          </p>
          <p>• 작성된 내용이 있는 문서만 다운로드할 수 있습니다.</p>
          <p>• 다운로드한 Word 파일은 필요에 따라 편집할 수 있습니다.</p>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="max-w-4xl mx-auto flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            className="gap-2"
            data-testid="button-prev"
          >
            <ArrowLeft className="w-4 h-4" />
            이전 단계
          </Button>
          <div></div>
        </div>
      </div>
    </div>
  );
}
