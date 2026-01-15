import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import {
  CheckCircle,
  Download,
  FileText,
  Calendar,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export function CompletePage() {
  const [, navigate] = useLocation();
  const { annualPlan, monthlyPlans, extractedPrograms, reset } = useAppStore();

  const handleExportAnnual = () => {
    if (!annualPlan) return;

    const content = generateAnnualPlanText(annualPlan);
    downloadTextFile(`${annualPlan.title}.txt`, content);
  };

  const handleExportMonthly = (plan: (typeof monthlyPlans)[0]) => {
    const content = generateMonthlyPlanText(plan);
    downloadTextFile(`${plan.year}년_${plan.month}월_사업계획서.txt`, content);
  };

  const handleStartNew = () => {
    reset();
    navigate("/");
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">작성 완료!</h1>
          <p className="text-muted-foreground">
            연간/월간 사업계획서가 성공적으로 생성되었습니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary mb-1">
                {extractedPrograms.length}
              </div>
              <p className="text-sm text-muted-foreground">추출된 프로그램</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary mb-1">
                {annualPlan?.sections.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">연간계획 섹션</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary mb-1">
                {monthlyPlans.length}
              </div>
              <p className="text-sm text-muted-foreground">월간계획서</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {annualPlan && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{annualPlan.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {annualPlan.sections.length}개 섹션
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAnnual}
                  className="gap-2"
                  data-testid="button-download-annual"
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </Button>
              </CardHeader>
            </Card>
          )}

          {monthlyPlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {plan.year}년 {plan.month}월 사업계획서
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {plan.items.length}개 프로그램
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportMonthly(plan)}
                  className="gap-2"
                  data-testid={`button-download-monthly-${plan.id}`}
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={handleStartNew}
            className="gap-2"
            data-testid="button-start-new"
          >
            <RotateCcw className="w-4 h-4" />
            새로 시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}

function generateAnnualPlanText(plan: NonNullable<ReturnType<typeof useAppStore.getState>["annualPlan"]>): string {
  let content = `${plan.title}\n`;
  content += "=".repeat(50) + "\n\n";

  content += "1. 사업의 필요성\n";
  content += "-".repeat(30) + "\n";
  content += (plan.necessity || "내용 없음") + "\n\n";

  content += "2. 전년도 사업평가 및 환류 계획\n";
  content += "-".repeat(30) + "\n\n";

  plan.sections.forEach((section, index) => {
    content += `[${section.category} - ${section.subCategory}]\n`;
    content += `문제점(사업평가):\n${section.problems || "내용 없음"}\n\n`;
    content += `개선계획(환류):\n${section.improvements || "내용 없음"}\n\n`;
  });

  content += "3. 총평\n";
  content += "-".repeat(30) + "\n";
  content += (plan.overallEvaluation || "내용 없음") + "\n";

  return content;
}

function generateMonthlyPlanText(plan: ReturnType<typeof useAppStore.getState>["monthlyPlans"][0]): string {
  let content = `${plan.year}년 ${plan.month}월 사업계획서\n`;
  content += "=".repeat(50) + "\n\n";

  content += "사업목표\n";
  content += "-".repeat(30) + "\n";
  content += (plan.objectives || "내용 없음") + "\n\n";

  content += "사업내용 및 수행인력\n";
  content += "-".repeat(30) + "\n";

  plan.items.forEach((item) => {
    content += `[${item.category}/${item.subCategory}] ${item.programName}\n`;
    content += `  참여자: ${item.participants}\n`;
    content += `  수행인력: ${item.staff}\n`;
    content += `  내용: ${item.content}\n\n`;
  });

  return content;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
