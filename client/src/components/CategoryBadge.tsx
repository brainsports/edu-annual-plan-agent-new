import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProgramCategory } from "@shared/schema";

const categoryColors: Record<ProgramCategory, string> = {
  보호: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  교육: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  문화: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  정서지원: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  지역연계: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

interface CategoryBadgeProps {
  category: ProgramCategory;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(categoryColors[category], "font-medium", className)}
    >
      {category}
    </Badge>
  );
}
