import { useMemo } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StepIndicator, getStepLabel } from "@/components/StepIndicator";
import { RightPanel, shouldShowRightPanel } from "@/components/RightPanel";
import { MobileStepDrawer } from "@/components/MobileStepDrawer";
import { MobileRightPanelSheet } from "@/components/MobileRightPanelSheet";

import { UploadPage } from "@/pages/UploadPage";
import { ClassifyPage } from "@/pages/ClassifyPage";
import AnnualPlanPart1Page from "@/pages/AnnualPlanPart1Page";
import AnnualPlanPart2Page from "@/pages/AnnualPlanPart2Page";
import MonthlyPlanFirstHalfPage from "@/pages/MonthlyPlanFirstHalfPage";
import MonthlyPlanSecondHalfPage from "@/pages/MonthlyPlanSecondHalfPage";
import { MonthlyPlanPage } from "@/pages/MonthlyPlanPage";
import { CompletePage } from "@/pages/CompletePage";
import { DownloadPage } from "@/pages/DownloadPage";
import NotFound from "@/pages/not-found";

import { Sparkles } from "lucide-react";

const stepRoutes: Record<number, string> = {
  1: "/",
  2: "/classify",
  3: "/annual/part1",
  4: "/annual/part2",
  5: "/monthly/first-half",
  6: "/monthly/second-half",
  7: "/download",
};

function getStepFromPath(pathname: string): number {
  if (!pathname) return 1;
  if (pathname === "/") return 1;
  if (pathname.startsWith("/classify")) return 2;
  if (pathname.startsWith("/annual/part1")) return 3;
  if (pathname.startsWith("/annual/part2")) return 4;
  if (pathname.startsWith("/monthly/first-half")) return 5;
  if (pathname.startsWith("/monthly/second-half")) return 6;
  if (pathname.startsWith("/download")) return 7;
  if (pathname.startsWith("/annual")) return 3;
  if (pathname.startsWith("/monthly")) return 5;
  if (pathname.startsWith("/complete")) return 7;
  return 1;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={UploadPage} />
      <Route path="/classify" component={ClassifyPage} />
      <Route path="/annual/part1" component={AnnualPlanPart1Page} />
      <Route path="/annual/part2" component={AnnualPlanPart2Page} />
      <Route path="/monthly/first-half" component={MonthlyPlanFirstHalfPage} />
      <Route path="/monthly/second-half" component={MonthlyPlanSecondHalfPage} />
      <Route path="/download" component={DownloadPage} />
      <Route path="/annual" component={AnnualPlanPart1Page} />
      <Route path="/monthly" component={MonthlyPlanPage} />
      <Route path="/complete" component={CompletePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function LeftSidebar({
  location,
  onStepClick,
}: {
  location: string;
  onStepClick: (step: number) => void;
}) {
  return (
    <aside className="hidden md:flex w-[200px] xl:w-[20%] xl:min-w-[240px] xl:max-w-[320px] flex-shrink-0 min-h-screen bg-sidebar border-r border-sidebar-border flex-col sticky top-0 h-screen">
      <div className="flex items-center gap-2 xl:gap-2.5 px-3 xl:px-4 py-4 xl:py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 xl:w-5 xl:h-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm text-sidebar-foreground truncate">
            참참 4.3
          </span>
          <span className="text-xs text-muted-foreground truncate hidden xl:block">
            연간프로그램 AI 도우미
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <StepIndicator pathname={location} onStepClick={onStepClick} />
      </div>

      <div className="p-3 xl:p-4 border-t border-sidebar-border">
        <ThemeToggle />
      </div>
    </aside>
  );
}

function MainContent({
  location,
  onStepClick,
}: {
  location: string;
  onStepClick: (step: number) => void;
}) {
  const currentStep = useMemo(() => getStepFromPath(location), [location]);
  const stepLabel = getStepLabel(currentStep);

  return (
    <div className="flex-1 flex flex-col min-h-screen min-w-0">
      <MobileStepDrawer currentStep={currentStep} onStepClick={onStepClick} />

      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 md:px-6 xl:px-8 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">
              {stepLabel}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
              단계 {currentStep} / 7
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <MobileRightPanelSheet currentStep={currentStep} />
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 xl:p-8 overflow-y-auto">
        {/* ✅ max-width 고정 해제: 페이지 내부 2열(입력/미리보기)이 더 넓게 쓸 수 있게 */}
        <div className="w-full">
          <Router />
        </div>
      </main>
    </div>
  );
}

function RightSidebar({ location }: { location: string }) {
  const currentStep = useMemo(() => getStepFromPath(location), [location]);

  // ✅ 3~6단계는 오른쪽 사이드바 자체를 제거해야 “빈 여백”이 안 남습니다.
  if (!shouldShowRightPanel(currentStep)) return null;

  return (
    <aside className="hidden xl:block w-[340px] flex-shrink-0 min-h-screen bg-muted/30 border-l border-border sticky top-0 h-screen overflow-y-auto">
      <RightPanel currentStep={currentStep} />
    </aside>
  );
}

function App() {
  const [location, navigate] = useLocation();

  const handleStepClick = (step: number) => {
    navigate(stepRoutes[step] || "/");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="flex min-h-screen w-full bg-background">
            <LeftSidebar location={location} onStepClick={handleStepClick} />
            <MainContent location={location} onStepClick={handleStepClick} />
            <RightSidebar location={location} />
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
