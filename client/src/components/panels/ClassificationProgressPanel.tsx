import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderOpen,
  Layers,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  보호: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  교육: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  문화: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  정서지원: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  지역연계: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
};

export function ClassificationProgressPanel() {
  const { uploadedFiles, extractedPrograms, classificationStatus } = useAppStore();

  const totalFiles = uploadedFiles.length;
  const processedFiles = uploadedFiles.filter(
    (f) => f.status === "success" || f.status === "error"
  ).length;
  const failedFiles = uploadedFiles.filter((f) => f.status === "error");
  const progress = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;

  const categorySummary = extractedPrograms.reduce(
    (acc, p) => {
      const cat = p.category || "미분류";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleRetryFailed = () => {
    // This would trigger retry logic - placeholder for now
    console.log("Retry failed files");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">분류 현황</h2>
        {classificationStatus === "processing" && (
          <Badge variant="secondary" className="text-xs animate-pulse">
            처리 중...
          </Badge>
        )}
        {classificationStatus === "complete" && (
          <Badge className="text-xs bg-primary/15 text-primary border-0">
            완료
          </Badge>
        )}
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>전체 진행률</span>
            <span className="text-primary">{Math.round(progress)}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{processedFiles}개 처리됨</span>
            <span>총 {totalFiles}개</span>
          </div>
        </CardContent>
      </Card>

      {/* Failed Files */}
      {failedFiles.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              실패한 파일 ({failedFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[120px]">
              <div className="divide-y divide-border">
                {failedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-destructive" />
                    <span className="truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={handleRetryFailed}
                data-testid="button-retry-failed"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                실패만 재시도
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classification Summary */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4" />
            분류 결과 요약
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Total Extracted */}
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">총 추출 수</span>
            </div>
            <span className="text-lg font-bold text-primary">
              {extractedPrograms.length}
            </span>
          </div>

          {/* Category Breakdown */}
          {Object.keys(categorySummary).length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                분류별 현황
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(categorySummary).map(([category, count]) => (
                  <div
                    key={category}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                      CATEGORY_COLORS[category] ||
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="font-medium">{category}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p>분류 결과가 없습니다</p>
              <p className="text-xs mt-1">PDF를 업로드하고 분류를 시작하세요</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
