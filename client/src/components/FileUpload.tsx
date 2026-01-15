import { useCallback, useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { UploadedFile } from "@shared/schema";

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  isUploading: boolean;
  fileType: "evaluation" | "annual_template" | "monthly_template";
  title: string;
  description: string;
}

export function FileUpload({
  onFileUpload,
  uploadedFiles,
  onRemoveFile,
  isUploading,
  fileType,
  title,
  description,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        await onFileUpload(file);
      }
    },
    [onFileUpload]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === "application/pdf") {
        await onFileUpload(file);
      }
      e.target.value = "";
    },
    [onFileUpload]
  );

  const filteredFiles = uploadedFiles.filter((f) => f.type === fileType);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 text-center",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
          data-testid={`input-file-${fileType}`}
        />
        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-muted-foreground" />
          )}
          <div>
            <p className="text-base font-medium">
              {isUploading ? "업로드 중..." : "PDF 파일을 드래그하거나 클릭하여 업로드"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              30페이지 내외의 PDF 파일
            </p>
          </div>
        </div>
      </div>

      {filteredFiles.length > 0 && (
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <Card
              key={file.id}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(file.uploadedAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveFile(file.id)}
                data-testid={`button-remove-file-${file.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
