import { useMemo } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StepIndicator, getStepLabel } from "@/components/StepIndicator";

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

function AppSidebar({ location, onStepClick }: { location: string; onStepClick: (step: number) => void }) {
  return (
    <aside className="w-64 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-sidebar-foreground">참참 4.3</span>
          <span className="text-xs text-muted-foreground">연간프로그램 AI 도우미</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <StepIndicator
          pathname={location}
          onStepClick={onStepClick}
        />
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <ThemeToggle />
      </div>
    </aside>
  );
}

function MainContent({ location }: { location: string }) {
  const currentStep = useMemo(() => getStepFromPath(location), [location]);
  const stepLabel = getStepLabel(currentStep);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{stepLabel}</h1>
            <p className="text-sm text-muted-foreground">단계 {currentStep} / 7</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        <Router />
      </main>
    </div>
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
          <div className="flex min-h-screen bg-background">
            <AppSidebar location={location} onStepClick={handleStepClick} />
            <MainContent location={location} />
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
