/**
 * Тонкий клиент к backend API (`TELEGRAM-BOT/src/flamenco_bot/api`).
 *
 * Ошибка запроса возвращается как `ApiResult` (см. `apiResult.ts`), а не как
 * пустой список — страница показывает «сервис временно недоступен».
 *
 * Запросы выполняются на сервере Next.js (в серверных компонентах), а не в
 * браузере — так фронтенд не дублирует бизнес-логику и не требует CORS на
 * backend. `API_BASE_URL` — серверная переменная окружения (без
 * `NEXT_PUBLIC_`), в браузер никогда не попадает.
 */

import { requestJson, type ApiResult } from "./apiResult";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export type ClassSlot = {
  id: number;
  class_key: string;
  class_label: string;
  starts_at: string;
  capacity: number;
  remaining: number;
  status: string;
  // Имя преподавателя для расписания, если назначен.
  teacher_name: string | null;
};

export type LessonPackage = {
  key: string;
  title: string;
  lessons: number;
  price_rub: number;
};

export type ClassFormat = {
  key: string;
  label: string;
  description: string;
  level: string;
};

function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return requestJson<T>(`${API_BASE_URL}${path}`);
}

export function getSchedule(classKey?: string): Promise<ApiResult<ClassSlot[]>> {
  const query = classKey ? `?class_key=${encodeURIComponent(classKey)}` : "";
  return apiGet<ClassSlot[]>(`/api/schedule${query}`);
}

export function getPackages(): Promise<ApiResult<LessonPackage[]>> {
  return apiGet<LessonPackage[]>("/api/packages");
}

export function getClasses(): Promise<ApiResult<ClassFormat[]>> {
  return apiGet<ClassFormat[]>("/api/classes");
}

// Правила записи — из backend (те же константы, по которым их проверяет
// репозиторий). Значения по умолчанию — на случай недоступного API: это
// только подписи, окончательную проверку всё равно делает backend.
export type BookingRules = {
  cancellation_deadline_hours: number;
  rebook_cooldown_hours: number;
};

const DEFAULT_BOOKING_RULES: BookingRules = {
  cancellation_deadline_hours: 24,
  rebook_cooldown_hours: 12,
};

export async function getBookingRules(): Promise<BookingRules> {
  const result = await apiGet<BookingRules>("/api/bookings/rules");
  return result.ok ? result.data : DEFAULT_BOOKING_RULES;
}

/** Записаться можно только на открытое занятие со свободными местами. */
export function isBookable(slot: ClassSlot): boolean {
  return slot.status === "open" && slot.remaining > 0;
}
