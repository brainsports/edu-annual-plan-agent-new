import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CategoryBadge } from "./CategoryBadge";
import { Edit2, Save, X, Loader2, Sparkles } from "lucide-react";
import type { ProgramCategory } from "@shared/schema";

interface AnnualPlanSectionType {
  id: string;
  category: ProgramCategory;
  subCategory: string;
  problems: string;
  improvements: string;
}

interface AnnualPlanSectionProps {
  section: AnnualPlanSectionType;
  onUpdate: (section: AnnualPlanSectionType) => void;
  onGenerateAI: (sectionId: string, field: "problems" | "improvements") => Promise<void>;
  isGenerating: boolean;
}

export function AnnualPlanSection({
  section,
  onUpdate,
  onGenerateAI,
  isGenerating,
}: AnnualPlanSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [problems, setProblems] = useState(section.problems);
  const [improvements, setImprovements] = useState(section.improvements);

  const handleSave = () => {
    onUpdate({
      ...section,
      problems,
      improvements,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setProblems(section.problems);
    setImprovements(section.improvements);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CategoryBadge category={section.category} />
          <span className="text-sm text-muted-foreground">{section.subCategory}</span>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              data-testid={`button-cancel-section-${section.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              data-testid={`button-save-section-${section.id}`}
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            data-testid={`button-edit-section-${section.id}`}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>문제점 (사업평가)</Label>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGenerateAI(section.id, "problems")}
                disabled={isGenerating}
                className="h-7 text-xs"
                data-testid={`button-ai-problems-${section.id}`}
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                AI 생성
              </Button>
            )}
          </div>
          {isEditing ? (
            <Textarea
              value={problems}
              onChange={(e) => setProblems(e.target.value)}
              rows={4}
              data-testid={`textarea-problems-${section.id}`}
            />
          ) : (
            <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap min-h-[80px]">
              {section.problems || "아직 내용이 없습니다."}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>개선계획 (환류)</Label>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGenerateAI(section.id, "improvements")}
                disabled={isGenerating}
                className="h-7 text-xs"
                data-testid={`button-ai-improvements-${section.id}`}
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                AI 생성
              </Button>
            )}
          </div>
          {isEditing ? (
            <Textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              rows={4}
              data-testid={`textarea-improvements-${section.id}`}
            />
          ) : (
            <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap min-h-[80px]">
              {section.improvements || "아직 내용이 없습니다."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
