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
import {
  ArrowRight,
  FileText,
  Sparkles,
  Calendar,
  Download,
} from "lucide-react";
import type { UploadedFile } from "@shared/schema";

export function UploadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { uploadedFiles, addUploadedFile, removeUploadedFile, setCurrentStep } =
    useAppStore();

  const [isUploading, setIsUploading] = useState(false);

  // ✅ 타입까지 명확히 지정(빨간줄 예방)
  const uploadMutation = useMutation<UploadedFile, Error, File>({
    mutationFn: async (file: File) => {
      // ✅ PDF만 허용(원하시면 제거 가능)
      if (file.type !== "application/pdf") {
        throw new Error("PDF_ONLY");
      }

      // ✅ 임시 업로드 성공 처리 (서버 없이도 다음 단계로 진행 가능)
      const fake: UploadedFile = {
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

    onError: (err) => {
      // PDF 아닌 경우 메시지 분기
      if (err?.message === "PDF_ONLY") {
        toast({
          title: "파일 형식 확인",
          description: "PDF 파일만 업로드할 수 있습니다.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "업로드 실패",
        description: "파일 업로드에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  // ✅ FileUpload 컴포넌트가 file 하나를 넘겨주는 형태에 맞춤
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
    }
  };

  const evaluationFiles = uploadedFiles.filter((f) => f.type === "evaluation");

  const handleNext = () => {
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 max-w-4xl w-full space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">다운로드</h3>
              <p className="text-sm text-muted-foreground">
                생성된 문서를 다운로드합니다
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
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

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleNext}
            disabled={evaluationFiles.length === 0}
            className="gap-2"
            data-testid="button-next-step"
          >
            다음 단계로 이동
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
