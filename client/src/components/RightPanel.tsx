import { UploadQueuePanel } from "@/components/panels/UploadQueuePanel";
import { ClassificationProgressPanel } from "@/components/panels/ClassificationProgressPanel";
import { GuidancePanel } from "@/components/panels/GuidancePanel";

interface RightPanelProps {
  currentStep: number;
}

// ✅ 3~6단계에서는 우측 패널(가이드)을 숨김
export const shouldShowRightPanel = (currentStep: number) => {
  return !(currentStep >= 3 && currentStep <= 6);
};

export function RightPanel({ currentStep }: RightPanelProps) {
  if (!shouldShowRightPanel(currentStep)) {
    return null;
  }

  switch (currentStep) {
    case 1:
      return <UploadQueuePanel />;
    case 2:
      return <ClassificationProgressPanel />;
    default:
      return <GuidancePanel step={currentStep} />;
  }
}
