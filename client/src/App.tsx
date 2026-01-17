import React, { useMemo } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StepIndicator } from "@/components/StepIndicator";

import { UploadPage } from "@/pages/UploadPage";
import { ClassifyPage } from "@/pages/ClassifyPage";

import AnnualPlanPart1Page from "@/pages/AnnualPlanPart1Page";
import AnnualPlanPart2Page from "@/pages/AnnualPlanPart2Page";

import MonthlyPlanFirstHalfPage from "@/pages/MonthlyPlanFirstHalfPage";
import MonthlyPlanSecondHalfPage from "@/pages/MonthlyPlanSecondHalfPage";

import { MonthlyPlanPage } from "@/pages/MonthlyPlanPage"; // ✅ 구 라우트 호환용
import { CompletePage } from "@/pages/CompletePage"; // ✅ 구 라우트 호환용
import { DownloadPage } from "@/pages/DownloadPage"; // ✅ 최종 다운로드 페이지
import NotFound from "@/pages/not-found";

import { Sparkles } from "lucide-react";

/** ✅ 7단계 라우트 매핑 */
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

  // ✅ 구 라우트 호환(스텝 표시만)
  if (pathname.startsWith("/annual")) return 3;
  if (pathname.startsWith("/monthly")) return 5;
  if (pathname.startsWith("/complete")) return 7;

  return 1;
}

function Router() {
  return (
    <Switch>
      {/* 1~2단계 */}
      <Route path="/" component={UploadPage} />
      <Route path="/classify" component={ClassifyPage} />

      {/* 3~7단계 */}
      <Route path="/annual/part1" component={AnnualPlanPart1Page} />
      <Route path="/annual/part2" component={AnnualPlanPart2Page} />
      <Route path="/monthly/first-half" component={MonthlyPlanFirstHalfPage} />
      <Route
        path="/monthly/second-half"
        component={MonthlyPlanSecondHalfPage}
      />
      <Route path="/download" component={DownloadPage} />

      {/* ✅ 구 라우트 호환(필요 시 유지) */}
      <Route path="/annual" component={AnnualPlanPart1Page} />
      <Route path="/monthly" component={MonthlyPlanPage} />
      <Route path="/complete" component={CompletePage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function AppHeader() {
  const [location, navigate] = useLocation();
  const currentStep = useMemo(() => getStepFromPath(location), [location]);

  const handleStepClick = (step: number) => {
    navigate(stepRoutes[step] || "/");
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg hidden sm:inline">
              연간프로그램 AI 도우미
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <StepIndicator
        pathname={location}
        currentStep={currentStep}
        onStepClick={handleStepClick}
      />
    </header>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <AppHeader />
            <main>
              <Router />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
