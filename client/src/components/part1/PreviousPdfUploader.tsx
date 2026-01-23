import * as React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Trash2 } from "lucide-react";

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;

  /** PDF 업로드 후 자동 채움 버튼 클릭 */
  onAutoFill?: () => void;

  /** 자동 채움 진행 중 UI (선택) */
  autoFillLoading?: boolean;

  /** 자동 채움 버튼 텍스트 (선택) */
  autoFillLabel?: string;
};

export function PreviousPdfUploader({
  file,
  onChange,
  onAutoFill,
  autoFillLoading = false,
  autoFillLabel = "PDF 내용 자동 채움",
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    onChange(f);

    // ✅ 같은 파일을 다시 선택해도 onChange가 동작하도록 값 초기화
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ✅ 자동 채움은 "파일이 있고" + "핸들러가 있고" + "로딩 중이 아닐 때"만 가능
  const canAutoFill = Boolean(file) && Boolean(onAutoFill) && !autoFillLoading;

  const handleAutoFillClick = () => {
    if (!file) return;
    if (!onAutoFill) return;
    if (autoFillLoading) return;
    onAutoFill();
  };

  return (
    <div className="mt-3">
      <div className="rounded-xl border border-dashed border-emerald-400/60 bg-emerald-50/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10">
              <FileText className="h-5 w-5 text-emerald-700" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800">
                참고자료(PDF)
              </div>

              {file ? (
                <>
                  <div className="mt-1 truncate text-sm text-slate-700">
                    {file.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    업로드됨 · {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-slate-500">
                  파일을 업로드합니다.
                </div>
              )}
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex shrink-0 items-center gap-2">
            {/* ✅ 메인색(Primary) 파일 선택 */}
            <Button
              type="button"
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handlePick}
            >
              파일 선택
            </Button>

            {/* ✅ 새 버튼: 자동 채움 */}
            <Button
              type="button"
              variant="outline"
              onClick={handleAutoFillClick}
              disabled={!canAutoFill}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {autoFillLoading ? "채우는 중..." : autoFillLabel}
            </Button>
          </div>
        </div>

        {/* 하단 액션(삭제) */}
        {file && (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              업로드된 PDF는 ‘사업의 필요성’ 작성 시 참고 자료로 사용됩니다.
            </div>

            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </button>
          </div>
        )}

        {/* 실제 input */}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
