import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Upload,
  RefreshCw,
  HardDrive,
} from "lucide-react";

export function UploadQueuePanel() {
  const { uploadedFiles, setUploadedFiles } = useAppStore();

  const totalFiles = uploadedFiles.length;
  const totalSize = uploadedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const failedFiles = uploadedFiles.filter((f) => f.status === "error");
  const successFiles = uploadedFiles.filter((f) => f.status === "success");
  const pendingFiles = uploadedFiles.filter((f) => f.status === "pending");

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleClearAll = () => {
    setUploadedFiles([]);
  };

  const handleRetryFailed = () => {
    const updated = uploadedFiles.map((f) =>
      f.status === "error" ? { ...f, status: "pending" as const } : f
    );
    setUploadedFiles(updated);
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== id));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">업로드 현황</h2>
        <Badge variant="secondary" className="text-xs">
          {totalFiles}개 파일
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <div className="flex flex-col items-center text-center">
            <Upload className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-lg font-bold text-primary">{totalFiles}</span>
            <span className="text-xs text-muted-foreground">전체</span>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex flex-col items-center text-center">
            <HardDrive className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-lg font-bold">{formatSize(totalSize)}</span>
            <span className="text-xs text-muted-foreground">용량</span>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-4 h-4 text-destructive mb-1" />
            <span className="text-lg font-bold text-destructive">
              {failedFiles.length}
            </span>
            <span className="text-xs text-muted-foreground">실패</span>
          </div>
        </Card>
      </div>

      {/* File List */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">파일 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {totalFiles === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>업로드된 파일이 없습니다</p>
            </div>
          ) : (
            <ScrollArea className="h-[240px]">
              <div className="divide-y divide-border">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 px-4 py-3 hover-elevate"
                    data-testid={`file-row-${file.id}`}
                  >
                    <div className="flex-shrink-0">
                      {file.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      ) : file.status === "error" ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(file.size || 0)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => handleRemoveFile(file.id)}
                      data-testid={`button-remove-${file.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {totalFiles > 0 && (
        <div className="flex gap-2">
          {failedFiles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleRetryFailed}
              data-testid="button-retry-failed"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              실패 재시도 ({failedFiles.length})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-destructive hover:text-destructive"
            onClick={handleClearAll}
            data-testid="button-clear-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            전체 삭제
          </Button>
        </div>
      )}

      {/* Status Summary */}
      {totalFiles > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-primary" />
            <span>성공: {successFiles.length}개</span>
          </div>
          {pendingFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              <span>대기: {pendingFiles.length}개</span>
            </div>
          )}
          {failedFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-destructive" />
              <span>실패: {failedFiles.length}개</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
