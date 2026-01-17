import React, { useMemo } from "react";

/** PART1 / PART2 분기용 모드 */
export type AnnualPlanMode = "PART1" | "PART2";

type Props = {
  mode?: AnnualPlanMode; // ✅ optional로 두면 더 안전합니다
};

/**
 * ✅ 연간 계획서 공용 페이지
 * - 입력 데이터(= 업로드 PDF에서 추출된 공통 데이터)는 동일
 * - 출력 결과물은 mode에 따라 달라짐 (PART1 vs PART2)
 */
function AnnualPlanPage({ mode = "PART1" }: Props) {
  const extractedItems = useMemo(() => {
    // TODO: 실제 데이터 연결로 교체
    return [];
  }, []);

  const title = mode === "PART1" ? "연간 PART 1" : "연간 PART 2";

  const outline = useMemo(() => {
    if (mode === "PART1") {
      return [
        {
          h3: "1. 사업의 필요성",
          h4: [
            "1) 이용아동의 욕구 및 문제점",
            "2) 지역 환경적 특성",
            "(1) 지역적 특성",
            "(2) 주변환경",
            "(3) 교육적 특성",
          ],
        },
        {
          h3: "2. 전년도 사업평가 및 환류계획",
          h4: ["1) 차년도 사업 환류 계획", "2) 총평"],
        },
        { h3: "3. 만족도조사", h4: [] },
        { h3: "4. 사업목적", h4: [] },
        { h3: "5. 사업목표", h4: [] },
      ];
    }

    return [
      {
        h3: "1. 세부사업내용",
        h4: [
          "1) 보호프로그램",
          "2) 교육프로그램",
          "3) 문화프로그램",
          "4) 정서지원프로그램",
          "5) 지역사회연계 프로그램",
        ],
      },
      {
        h3: "2. 평가계획",
        h4: [
          "1) 보호프로그램",
          "2) 교육프로그램",
          "3) 문화프로그램",
          "4) 정서지원프로그램",
          "5) 지역사회연계 프로그램",
        ],
      },
    ];
  }, [mode]);

  const promptGuide = useMemo(() => {
    if (mode === "PART1") {
      return `
[연간 PART1 생성]
- 입력 데이터: 프로그램 평가서 PDF에서 추출된 공통 항목(일자, 담당자, 분류, 프로그램명, 주제, 대상, 기간, 인원, 목적/목표/내용/운영/만족도/향후계획 등)
- 출력 목적: '사업의 필요성', '전년도 평가 및 환류', '만족도조사', '사업목적', '사업목표' 중심으로 요약/총평/근거를 정리
- 같은 데이터라도 PART2(세부내용/평가계획) 형식으로 쓰지 말 것
      `.trim();
    }

    return `
[연간 PART2 생성]
- 입력 데이터: 프로그램 평가서 PDF에서 추출된 공통 항목(일자, 담당자, 분류, 프로그램명, 주제, 대상, 기간, 인원, 목적/목표/내용/운영/만족도/향후계획 등)
- 출력 목적: '세부사업내용(프로그램별 운영 내용)'과 '평가계획(프로그램별 평가 방법/지표/환류)'을 체계적으로 정리
- 같은 데이터라도 PART1(필요성/총평/목적목표) 형식으로 쓰지 말 것
    `.trim();
  }, [mode]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          업로드 PDF에서 추출된 공통 데이터를 사용하되, 결과물 구조는 {mode} 형식으로 생성합니다.
        </p>
      </div>

      <div className="mb-6 rounded-lg border p-4">
        <div className="text-sm">
          추출 데이터(임시): <span className="font-medium">{extractedItems.length}</span>개
        </div>
        <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
          {promptGuide}
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="text-sm font-medium mb-3">출력 구조(미리보기)</div>

        <div className="space-y-4">
          {outline.map((sec) => (
            <div key={sec.h3} className="rounded-md border p-3">
              <div className="font-semibold">{sec.h3}</div>
              {sec.h4.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                  {sec.h4.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnnualPlanPage;

// ✅ (선택) 혹시 다른 파일에서 named import를 쓰고 있으면 이것도 살려둡니다.
export { AnnualPlanPage };
