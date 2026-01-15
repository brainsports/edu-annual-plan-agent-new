import { Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "./CategoryBadge";
import type { ProgramInfo } from "@shared/schema";

interface ClassificationCardProps {
  program: ProgramInfo;
  onEdit: (program: ProgramInfo) => void;
}

export function ClassificationCard({ program, onEdit }: ClassificationCardProps) {
  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="space-y-1.5">
          <h3 className="font-semibold text-base leading-tight">{program.programName}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={program.category} />
            <span className="text-xs text-muted-foreground">{program.subCategory}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(program)}
          data-testid={`button-edit-program-${program.id}`}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">기간</span>
            <p className="font-medium">{program.startDate} ~ {program.endDate}</p>
          </div>
          <div>
            <span className="text-muted-foreground">대상</span>
            <p className="font-medium">{program.targetChildren}</p>
          </div>
          <div>
            <span className="text-muted-foreground">인원</span>
            <p className="font-medium">{program.participantCount}명</p>
          </div>
          <div>
            <span className="text-muted-foreground">회기</span>
            <p className="font-medium">{program.sessions}회</p>
          </div>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">목표</span>
          <p className="text-sm mt-1 line-clamp-2">{program.goal}</p>
        </div>
      </CardContent>
    </Card>
  );
}
