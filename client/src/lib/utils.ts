import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 기존 스타일 관련 함수 (유지)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 날짜 오류(Invalid Date) 해결을 위한 함수 (추가)
export function formatDate(dateInput: any): string {
  if (!dateInput) return "날짜 정보 없음";

  const date = new Date(dateInput);

  // 날짜 데이터가 유효하지 않을 경우 처리
  if (isNaN(date.getTime())) {
    return "날짜 확인 불가";
  }

  // 한국 형식(2026. 01. 25.)으로 변환
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
