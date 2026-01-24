import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export type NecessityData = {
  keywords: {
    childNeeds: string[]; // 3
    regionSummary: string[]; // 3
    regionLocal: string[]; // 3
    regionAround: string[]; // 3
    regionEdu: string[]; // 3
  };
  text: {
    childNeeds: string;
    regionSummary: string;
    regionLocal: string;
    regionAround: string;
    regionEdu: string;
  };
};

type Props = {
  value: NecessityData;
  onChange: (next: NecessityData) => void;
};

const ensure3 = (arr?: string[]) => {
  const a = Array.isArray(arr) ? [...arr] : [];
  while (a.length < 3) a.push("");
  return a.slice(0, 3);
};

function SectionBlock({
  title,
  hint,
  keywords,
  text,
  onChangeKeywords,
  onChangeText,
}: {
  title: string;
  hint?: string;
  keywords: string[];
  text: string;
  onChangeKeywords: (next: string[]) => void;
  onChangeText: (next: string) => void;
}) {
  const k = ensure3(keywords);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Label className="text-sm font-semibold">{title}</Label>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {k.map((v, idx) => (
          <Input
            key={idx}
            value={v}
            onChange={(e) => {
              const next = [...k];
              next[idx] = e.target.value;
              onChangeKeywords(next);
            }}
            placeholder={`키워드 ${idx + 1}`}
          />
        ))}
      </div>

      <Textarea
        value={text}
        onChange={(e) => onChangeText(e.target.value)}
        rows={4}
        placeholder="필요한 내용을 입력합니다."
      />
    </div>
  );
}

// ✅ named export 제공 (중괄호 import 대응)
export function NecessityEditor({ value, onChange }: Props) {
  const v: NecessityData = React.useMemo(() => {
    return {
      keywords: {
        childNeeds: ensure3(value?.keywords?.childNeeds),
        regionSummary: ensure3(value?.keywords?.regionSummary),
        regionLocal: ensure3(value?.keywords?.regionLocal),
        regionAround: ensure3(value?.keywords?.regionAround),
        regionEdu: ensure3(value?.keywords?.regionEdu),
      },
      text: {
        childNeeds: value?.text?.childNeeds ?? "",
        regionSummary: value?.text?.regionSummary ?? "",
        regionLocal: value?.text?.regionLocal ?? "",
        regionAround: value?.text?.regionAround ?? "",
        regionEdu: value?.text?.regionEdu ?? "",
      },
    };
  }, [value]);

  const patch = (partial: Partial<NecessityData>) => {
    onChange({
      ...v,
      ...partial,
      keywords: { ...v.keywords, ...(partial.keywords ?? {}) },
      text: { ...v.text, ...(partial.text ?? {}) },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">사업의 필요성 입력</CardTitle>
        <p className="text-xs text-muted-foreground">
          수정할 내용만 키워드로 입력하고 ‘AI 생성’을 누릅니다.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <SectionBlock
          title="1) 이용아동의 욕구 및 문제점"
          keywords={v.keywords.childNeeds}
          text={v.text.childNeeds}
          onChangeKeywords={(next) =>
            patch({ keywords: { childNeeds: next } as any })
          }
          onChangeText={(next) => patch({ text: { childNeeds: next } as any })}
        />

        <SectionBlock
          title="2) 지역 환경적 특성(요약)"
          keywords={v.keywords.regionSummary}
          text={v.text.regionSummary}
          onChangeKeywords={(next) =>
            patch({ keywords: { regionSummary: next } as any })
          }
          onChangeText={(next) =>
            patch({ text: { regionSummary: next } as any })
          }
        />

        <SectionBlock
          title="(1) 지역적 특성"
          keywords={v.keywords.regionLocal}
          text={v.text.regionLocal}
          onChangeKeywords={(next) =>
            patch({ keywords: { regionLocal: next } as any })
          }
          onChangeText={(next) => patch({ text: { regionLocal: next } as any })}
        />

        <SectionBlock
          title="(2) 주변환경"
          keywords={v.keywords.regionAround}
          text={v.text.regionAround}
          onChangeKeywords={(next) =>
            patch({ keywords: { regionAround: next } as any })
          }
          onChangeText={(next) =>
            patch({ text: { regionAround: next } as any })
          }
        />

        <SectionBlock
          title="(3) 교육적 특성"
          keywords={v.keywords.regionEdu}
          text={v.text.regionEdu}
          onChangeKeywords={(next) =>
            patch({ keywords: { regionEdu: next } as any })
          }
          onChangeText={(next) => patch({ text: { regionEdu: next } as any })}
        />
      </CardContent>
    </Card>
  );
}

// ✅ default export도 유지 (기본 import 대응)
export default NecessityEditor;
