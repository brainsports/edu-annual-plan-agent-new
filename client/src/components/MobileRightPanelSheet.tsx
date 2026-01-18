import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RightPanel } from "@/components/RightPanel";

interface MobileRightPanelSheetProps {
  currentStep: number;
}

export function MobileRightPanelSheet({ currentStep }: MobileRightPanelSheetProps) {
  const getButtonLabel = () => {
    if (currentStep === 1) return "업로드 현황";
    if (currentStep === 2) return "분류 진행";
    return "안내";
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="xl:hidden flex items-center gap-1.5 whitespace-nowrap"
          data-testid="button-open-right-panel"
        >
          <Info className="w-4 h-4" />
          <span className="hidden sm:inline">{getButtonLabel()}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>{getButtonLabel()}</SheetTitle>
        </SheetHeader>
        <RightPanel currentStep={currentStep} />
      </SheetContent>
    </Sheet>
  );
}
