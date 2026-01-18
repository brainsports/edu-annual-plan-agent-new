import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Download,
  Calendar,
  ClipboardList,
} from "lucide-react";

interface GuidancePanelProps {
  step: number;
}

const STEP_GUIDANCE: Record<
  number,
  {
    title: string;
    icon: typeof FileText;
    description: string;
    tips: string[];
    nextAction?: string;
  }
> = {
  3: {
    title: "연간 Part 1 작성",
    icon: ClipboardList,
    description: "사업 개요와 목표를 설정합니다. AI가 자동으로 초안을 생성해 드립니다.",
    tips: [
      "예시 작성 버튼으로 샘플 데이터를 확인해 보세요",
      "자동 작성 버튼으로 AI가 내용을 생성합니다",
      "각 섹션을 클릭하여 직접 수정할 수 있습니다",
    ],
    nextAction: "Part 2로 이동",
  },
  4: {
    title: "연간 Part 2 작성",
    icon: ClipboardList,
    description: "세부 사업내용과 평가계획을 영역별로 작성합니다.",
    tips: [
      "5개 영역(보호, 교육, 문화, 정서지원, 지역연계)별로 작성합니다",
      "각 영역의 프로그램 목표와 내용을 구체적으로 입력하세요",
      "AI 자동 작성 기능을 활용해 시간을 절약하세요",
    ],
    nextAction: "상반기 계획으로 이동",
  },
  5: {
    title: "상반기 월간계획",
    icon: Calendar,
    description: "1월~6월까지의 월별 사업계획을 작성합니다.",
    tips: [
      "각 월 탭을 클릭하여 월별 계획을 작성하세요",
      "월별 사업목표, 중점사항을 입력합니다",
      "주차별 업무 계획을 구체적으로 작성하세요",
    ],
    nextAction: "하반기 계획으로 이동",
  },
  6: {
    title: "하반기 월간계획",
    icon: Calendar,
    description: "7월~12월까지의 월별 사업계획을 작성합니다.",
    tips: [
      "상반기와 동일한 형식으로 작성합니다",
      "연간 목표와 일관성을 유지하세요",
      "계절별 특성을 고려한 프로그램을 배치하세요",
    ],
    nextAction: "다운로드로 이동",
  },
  7: {
    title: "문서 다운로드",
    icon: Download,
    description: "작성한 계획서를 Word 문서로 다운로드합니다.",
    tips: [
      "각 문서별로 개별 다운로드가 가능합니다",
      "연간계획 Part 1, Part 2를 별도로 다운로드하세요",
      "월간계획은 상반기/하반기로 나누어 다운로드됩니다",
    ],
  },
};

export function GuidancePanel({ step }: GuidancePanelProps) {
  const guidance = STEP_GUIDANCE[step];

  if (!guidance) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">가이드 정보가 없습니다</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const IconComponent = guidance.icon;

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-sm sm:text-base">작성 가이드</h2>
      </div>

      {/* Main Guidance Card */}
      <Card>
        <CardHeader className="py-3 sm:py-4 px-3 sm:px-4">
          <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            </div>
            <span className="truncate">{guidance.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {guidance.description}
          </p>
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card>
        <CardHeader className="py-2.5 sm:py-3 px-3 sm:px-4">
          <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0" />
            작성 팁
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <ul className="space-y-1.5 sm:space-y-2">
            {guidance.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Next Action */}
      {guidance.nextAction && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 sm:py-4 px-3 sm:px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">다음 단계</span>
              </div>
              <span className="text-xs sm:text-sm text-primary font-medium truncate">
                {guidance.nextAction}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
