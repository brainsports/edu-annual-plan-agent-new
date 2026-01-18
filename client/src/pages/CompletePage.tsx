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
} from "lucide-react";

export function CompletePage() {
  const [, navigate] = useLocation();
  const { annualPlan, monthlyPlans, extractedPrograms, reset } = useAppStore();

  const part1Count = annualPlan?.part1 ? Object.keys(annualPlan.part1).length : 0;
  const part2Count = annualPlan?.part2 ? Object.keys(annualPlan.part2).length : 0;
  const totalSections = part1Count + part2Count;

  const handleStartNew = () => {
    reset();
    navigate("/");
  };

  const handleGoToDownload = () => {
    navigate("/download");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 max-w-4xl w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground">
            연간/월간 사업계획서가 성공적으로 생성되었습니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                {totalSections}
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
                      Part 1: {part1Count}개 섹션 / Part 2: {part2Count}개 섹션
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoToDownload}
                  className="gap-2"
                  data-testid="button-download-annual"
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </Button>
              </CardHeader>
            </Card>
          )}

          {monthlyPlans.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">월간 사업계획서</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {monthlyPlans.length}개 월간계획서
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoToDownload}
                  className="gap-2"
                  data-testid="button-download-monthly"
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </Button>
              </CardHeader>
            </Card>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            onClick={handleStartNew}
            className="gap-2"
            data-testid="button-start-new"
          >
            <RotateCcw className="w-4 h-4" />
            새로 시작하기
          </Button>
          <Button
            onClick={handleGoToDownload}
            className="gap-2"
            data-testid="button-go-download"
          >
            <Download className="w-4 h-4" />
            다운로드 페이지로 이동
          </Button>
        </div>
      </div>
    </div>
  );
}
