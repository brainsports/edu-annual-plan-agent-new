import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProgramInfo, ProgramCategory } from "@shared/schema";

const categories: ProgramCategory[] = ["보호", "교육", "문화", "정서지원", "지역연계"];

const subCategories: Record<ProgramCategory, string[]> = {
  보호: ["생활", "안전"],
  교육: ["성장과권리", "학습", "특기적성"],
  문화: ["체험활동"],
  정서지원: ["상담"],
  지역연계: ["연계"],
};

const formSchema = z.object({
  programName: z.string().min(1, "프로그램명을 입력해주세요"),
  category: z.enum(["보호", "교육", "문화", "정서지원", "지역연계"]),
  subCategory: z.string().min(1, "중분류를 선택해주세요"),
  startDate: z.string().min(1, "시작일을 입력해주세요"),
  endDate: z.string().min(1, "종료일을 입력해주세요"),
  targetChildren: z.string().min(1, "대상아동을 입력해주세요"),
  participantCount: z.number().min(1, "인원을 입력해주세요"),
  sessions: z.number().min(1, "회기수를 입력해주세요"),
  plan: z.string().min(1, "계획을 입력해주세요"),
  goal: z.string().min(1, "목표를 입력해주세요"),
});

interface ProgramEditDialogProps {
  program: ProgramInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (program: ProgramInfo) => void;
}

export function ProgramEditDialog({
  program,
  open,
  onOpenChange,
  onSave,
}: ProgramEditDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: program
      ? {
          programName: program.programName,
          category: program.category,
          subCategory: program.subCategory,
          startDate: program.startDate,
          endDate: program.endDate,
          targetChildren: program.targetChildren,
          participantCount: program.participantCount,
          sessions: program.sessions,
          plan: program.plan,
          goal: program.goal,
        }
      : {
          programName: "",
          category: "교육" as ProgramCategory,
          subCategory: "",
          startDate: "",
          endDate: "",
          targetChildren: "",
          participantCount: 0,
          sessions: 0,
          plan: "",
          goal: "",
        },
  });

  const selectedCategory = form.watch("category");

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    if (program) {
      onSave({
        ...program,
        ...values,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>프로그램 정보 수정</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="programName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>프로그램명 *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-program-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>대분류 *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="대분류 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>중분류 *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-subcategory">
                          <SelectValue placeholder="중분류 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subCategories[selectedCategory]?.map((sub) => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시작일 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>종료일 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="targetChildren"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>대상아동 *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-target-children" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="participantCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>인원 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-participant-count"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sessions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>회기 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-sessions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>계획 *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      data-testid="input-plan"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>목표 *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      data-testid="input-goal"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit" data-testid="button-save-program">
                저장
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
