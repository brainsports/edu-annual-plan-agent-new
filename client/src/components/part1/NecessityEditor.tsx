import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronDown } from "lucide-react";

export type NecessityItemKey =
  | "childNeeds"
  | "regionSummary"
  | "regionLocal"
  | "regionAround"
  | "regionEdu";

export type NecessityData = {
  keywords: Record<NecessityItemKey, string[]>;
  text: Record<NecessityItemKey, string>;
};

export function createEmptyNecessityData(): NecessityData {
  return {
    keywords: {
      childNeeds: ["", "", ""], // ✅ 3칸
      regionSummary: ["", "", ""],
      regionLocal: ["", "", ""],
      regionAround: ["", "", ""],
      regionEdu: ["", "", ""],
    },
    text: {
      childNeeds: "",
      regionSummary: "",
      regionLocal: "",
      regionAround: "",
      regionEdu: "",
    },
  };
}

type Props = {
  value: NecessityData;
  onChange: (next: NecessityData) => void;

  /**
   * AI 생성 버튼을 누르면 호출됩니다.
   * - keywords 기반으로 500자 내외 텍스트를 만들어서 return
   */
  onGenerateItem?: (key: NecessityItemKey, keywords: string[]) => Promise<string>;
};

const ITEM_META: Record<
  NecessityItemKey,
  { title: string; slots: number; placeholderBase: string }
> = {
  childNeeds: {
    title: "1) 이용아동의 욕구 및 문제점",
    slots: 3, // ✅ 4 → 3으로 고정
    placeholderBase: "예: 돌봄공백, 정서불안, 학습결손",
  },
  regionSummary: {
    title: "2) 지역 환경적 특성 (요약)",
    slots: 3,
    placeholderBase: "예: 자원부족, 접근성, 방과후",
  },
  regionLocal: {
    title: "(1) 지역적 특성",
    slots: 3,
    placeholderBase: "예: 인구구성, 이동동선, 생활권",
  },
  regionAround: {
    title: "(2) 주변환경",
    slots: 3,
    placeholderBase: "예: 안전, 문화공간, 학습공간",
  },
  regionEdu: {
    title: "(3) 교육적 특성",
    slots: 3,
    placeholderBase: "예: 기초학력, 개별지도, 학교적응",
  },
};

function ensureSlots(arr: string[], slots: number) {
  const next = [...(arr ?? [])];
  while (next.length < slots) next.push("");
  return next.slice(0, slots);
}

function KeywordRow(props: {
  title: string;
  keywords: string[];
  slots: number;
  placeholderBase: string;
  onChange: (nextKeywords: string[]) => void;
  loading: boolean;
  onClickAI: () => void;
  aiDisabled?: boolean;
  hasText?: boolean;
}) {
  const {
    title,
    keywords,
    slots,
    placeholderBase,
    onChange,
    loading,
    onClickAI,
    aiDisabled,
    hasText,
  } = props;

  const normalized = useMemo(() => ensureSlots(keywords, slots), [keywords, slots]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {hasText ? (
            <span className="text-[11px] rounded-full bg-green-50 text-green-700 px-2 py-0.5 border border-green-100">
              작성됨
            </span>
          ) : null}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1"
          onClick={onClickAI}
          disabled={aiDisabled || loading}
          title="키워드로 500자 내외 문장을 생성합니다."
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          AI 생성
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {normalized.map((v, idx) => (
          <input
            key={idx}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
            placeholder={`키워드 ${idx + 1}`}
            value={v}
            onChange={(e) => {
              const next = [...normalized];
              next[idx] = e.target.value;
              onChange(next);
            }}
          />
        ))}
      </div>

      <div className="text-xs text-slate-500">{placeholderBase}</div>
    </div>
  );
}

export function NecessityEditor({ value, onChange, onGenerateItem }: Props) {
  const [loadingKey, setLoadingKey] = useState<NecessityItemKey | null>(null);

  const setKeywords = (key: NecessityItemKey, nextKeywords: string[]) => {
    onChange({
      ...value,
      keywords: {
        ...value.keywords,
        [key]: nextKeywords,
      },
    });
  };

  const setText = (key: NecessityItemKey, text: string) => {
    onChange({
      ...value,
      text: {
        ...value.text,
        [key]: text,
      },
    });
  };

  const handleAI = async (key: NecessityItemKey) => {
    if (!onGenerateItem) return;

    const kws = (value.keywords?.[key] ?? [])
      .map((s) => (s ?? "").trim())
      .filter(Boolean);

    if (kws.length === 0) return; // 키워드 없으면 생성 안 함

    setLoadingKey(key);
    try {
      const text = await onGenerateItem(key, kws);
      if (text) setText(key, text);
    } finally {
      setLoadingKey(null);
    }
  };

  const row = (key: NecessityItemKey) => {
    const meta = ITEM_META[key];
    return (
      <KeywordRow
        key={key}
        title={meta.title}
        keywords={value.keywords?.[key] ?? []}
        slots={meta.slots}
        placeholderBase={meta.placeholderBase}
        onChange={(next) => setKeywords(key, next)}
        loading={loadingKey === key}
        onClickAI={() => handleAI(key)}
        aiDisabled={!onGenerateItem}
        hasText={!!value.text?.[key]?.trim()}
      />
    );
  };

  return (
    <div className="space-y-3">
      {/* 상위 1 */}
      <details className="group rounded-xl border border-slate-200 bg-white p-3" open>
        <summary className="cursor-pointer select-none list-none">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-900">
              1) 이용아동의 욕구 및 문제점
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500 transition group-open:rotate-180" />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            수정할 내용만 키워드로 입력하고 ‘AI 생성’을 누릅니다.
          </div>
        </summary>
        <div className="mt-3">{row("childNeeds")}</div>
      </details>

      {/* 상위 2 */}
      <details className="group rounded-xl border border-slate-200 bg-white p-3" open>
        <summary className="cursor-pointer select-none list-none">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-900">2) 지역 환경적 특성</div>
            <ChevronDown className="w-4 h-4 text-slate-500 transition group-open:rotate-180" />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            (요약) → (1) → (2) → (3) 순서로 키워드 입력 후 AI 생성합니다.
          </div>
        </summary>

        <div className="mt-3 space-y-3">
          {row("regionSummary")}
          {row("regionLocal")}
          {row("regionAround")}
          {row("regionEdu")}
        </div>
      </details>
    </div>
  );
}
