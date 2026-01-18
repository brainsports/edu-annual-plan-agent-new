import { UploadQueuePanel } from "@/components/panels/UploadQueuePanel";
import { ClassificationProgressPanel } from "@/components/panels/ClassificationProgressPanel";
import { GuidancePanel } from "@/components/panels/GuidancePanel";

interface RightPanelProps {
  currentStep: number;
}

export function RightPanel({ currentStep }: RightPanelProps) {
  switch (currentStep) {
    case 1:
      return <UploadQueuePanel />;
    case 2:
      return <ClassificationProgressPanel />;
    default:
      return <GuidancePanel step={currentStep} />;
  }
}
