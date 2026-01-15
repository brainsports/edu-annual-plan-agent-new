import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StepIndicator } from "@/components/StepIndicator";
import { useAppStore } from "@/lib/store";
import { UploadPage } from "@/pages/UploadPage";
import { ClassifyPage } from "@/pages/ClassifyPage";
import { AnnualPlanPage } from "@/pages/AnnualPlanPage";
import { MonthlyPlanPage } from "@/pages/MonthlyPlanPage";
import { CompletePage } from "@/pages/CompletePage";
import NotFound from "@/pages/not-found";
import { Sparkles } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={UploadPage} />
      <Route path="/classify" component={ClassifyPage} />
      <Route path="/annual" component={AnnualPlanPage} />
      <Route path="/monthly" component={MonthlyPlanPage} />
      <Route path="/complete" component={CompletePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

const stepRoutes: Record<number, string> = {
  1: "/",
  2: "/classify",
  3: "/annual",
  4: "/monthly",
  5: "/complete",
};

function AppHeader() {
  const [, navigate] = useLocation();
  const { currentStep, setCurrentStep } = useAppStore();

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
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
      <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />
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
