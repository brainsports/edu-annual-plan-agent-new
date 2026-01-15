import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { ArrowRight, FileText, Sparkles, Calendar } from "lucide-react";
import type { UploadedFile } from "@shared/schema";

export function UploadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { uploadedFiles, addUploadedFile, removeUploadedFile, setCurrentStep } =
    useAppStore();

  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // ✅ 임시 업로드 성공 처리 (서버 없이도 다음 단계로 진행 가능)
      const fake = {
        id: String(Date.now()),
        name: file.name,
        type: "evaluation",
        size: file.size,
      } as unknown as UploadedFile;

      // 업로드처럼 보이게 살짝 대기(선택)
      await new Promise((r) => setTimeout(r, 200));

      return fake;
    },

    onSuccess: (data) => {
      addUploadedFile(data);
      toast({
        title: "업로드 완료",
        description: `${data.name} 파일이 업로드되었습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "업로드 실패",
        description: "파일 업로드에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => {
    const evaluationFiles = uploadedFiles.filter(
      (f) => f.type === "evaluation",
    );
    if (evaluationFiles.length === 0) {
      toast({
        title: "파일 필요",
        description: "프로그램 평가서 PDF를 업로드해주세요.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep(2);
    navigate("/classify");
  };

  const evaluationFiles = uploadedFiles.filter((f) => f.type === "evaluation");

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            연간프로그램 AI 생성도우미
          </h1>
          <p className="text-muted-foreground text-lg">
            PDF 평가서를 업로드하면 AI가 자동으로 연간/월간 계획서를 생성합니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">PDF 업로드</h3>
              <p className="text-sm text-muted-foreground">
                프로그램 평가서 PDF를 업로드합니다
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">AI 자동 분류</h3>
              <p className="text-sm text-muted-foreground">
                주요 정보를 자동으로 분류합니다
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">계획서 생성</h3>
              <p className="text-sm text-muted-foreground">
                연간/월간 계획서를 생성합니다
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>프로그램 평가서 업로드</CardTitle>
            <CardDescription>
              지역아동센터 프로그램 평가서 PDF 파일을 업로드해주세요. AI가
              자동으로 주요 정보를 추출하여 연간/월간 계획서를 생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFileUpload={handleFileUpload}
              uploadedFiles={uploadedFiles}
              onRemoveFile={removeUploadedFile}
              isUploading={isUploading}
              fileType="evaluation"
              title="프로그램 평가서"
              description="PDF 형식의 프로그램 평가서를 업로드해주세요"
            />
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="max-w-4xl mx-auto flex justify-end">
          <Button
            onClick={handleNext}
            disabled={evaluationFiles.length === 0}
            className="gap-2"
            data-testid="button-next-step"
          >
            다음 단계
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
