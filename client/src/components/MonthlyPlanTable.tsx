import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CategoryBadge } from "./CategoryBadge";
import { Edit2, Save, X, Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MonthlyPlan, MonthlyPlanItem, ProgramCategory } from "@shared/schema";

interface MonthlyPlanTableProps {
  plan: MonthlyPlan;
  onUpdate: (plan: MonthlyPlan) => void;
}

export function MonthlyPlanTable({ plan, onUpdate }: MonthlyPlanTableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [objectives, setObjectives] = useState(plan.objectives);
  const [items, setItems] = useState<MonthlyPlanItem[]>(plan.items);

  const handleSave = () => {
    onUpdate({
      ...plan,
      objectives,
      items,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setObjectives(plan.objectives);
    setItems(plan.items);
    setIsEditing(false);
  };

  const handleAddItem = () => {
    const newItem: MonthlyPlanItem = {
      id: `item-${Date.now()}`,
      category: "교육" as ProgramCategory,
      subCategory: "학습",
      programName: "",
      participants: "",
      staff: "",
      content: "",
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const handleItemChange = (
    itemId: string,
    field: keyof MonthlyPlanItem,
    value: string
  ) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-lg">
          {plan.year}년 {plan.month}월 사업계획서
        </CardTitle>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              data-testid="button-cancel-monthly"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              data-testid="button-save-monthly"
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            data-testid="button-edit-monthly"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">사업목표</label>
          {isEditing ? (
            <Textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              rows={3}
              data-testid="textarea-objectives"
            />
          ) : (
            <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
              {plan.objectives || "사업목표를 입력해주세요."}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">사업내용 및 수행인력</label>
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                data-testid="button-add-item"
              >
                <Plus className="w-4 h-4 mr-1" />
                항목 추가
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">대분류</TableHead>
                  <TableHead className="min-w-[80px]">중분류</TableHead>
                  <TableHead className="min-w-[120px]">프로그램명</TableHead>
                  <TableHead className="min-w-[100px]">참여자</TableHead>
                  <TableHead className="min-w-[100px]">수행인력</TableHead>
                  <TableHead className="min-w-[200px]">내용</TableHead>
                  {isEditing && <TableHead className="w-[60px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <CategoryBadge category={item.category} />
                    </TableCell>
                    <TableCell className="text-sm">{item.subCategory}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={item.programName}
                          onChange={(e) =>
                            handleItemChange(item.id, "programName", e.target.value)
                          }
                          className="h-8"
                          data-testid={`input-program-${item.id}`}
                        />
                      ) : (
                        <span className="text-sm font-medium">{item.programName}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={item.participants}
                          onChange={(e) =>
                            handleItemChange(item.id, "participants", e.target.value)
                          }
                          className="h-8"
                          data-testid={`input-participants-${item.id}`}
                        />
                      ) : (
                        <span className="text-sm">{item.participants}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={item.staff}
                          onChange={(e) =>
                            handleItemChange(item.id, "staff", e.target.value)
                          }
                          className="h-8"
                          data-testid={`input-staff-${item.id}`}
                        />
                      ) : (
                        <span className="text-sm">{item.staff}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={item.content}
                          onChange={(e) =>
                            handleItemChange(item.id, "content", e.target.value)
                          }
                          className="h-8"
                          data-testid={`input-content-${item.id}`}
                        />
                      ) : (
                        <span className="text-sm">{item.content}</span>
                      )}
                    </TableCell>
                    {isEditing && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-8 w-8 text-destructive"
                          data-testid={`button-remove-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isEditing ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      등록된 프로그램이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
