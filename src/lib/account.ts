import { cookies } from "next/headers";
import { cache } from "react";
import { requestJson, type ApiResult } from "./apiResult";
import { getSession } from "./auth";

/**
 * Личный кабинет (Stage 5): профиль, баланс, мои занятия, поддержка.
 * Все данные — с backend (`TELEGRAM-BOT/src/flamenco_bot/api`), сессия передаётся тем же
 * способом, что и в `lib/auth.ts`: cookie пересылается напрямую backend'у,
 * а не через rewrite (это серверные компоненты, не браузер).
 */

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
const SESSION_COOKIE_NAME = "session";

async function fetchWithSession<T>(path: string): Promise<ApiResult<T>> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session) {
    return { ok: false, error: "unauthorized", status: null };
  }
  // Данные кабинета backend отдаёт только с привязанным Telegram (409 без
  // него) — не спрашиваем заранее известный отказ. getSession кэширован на
  // рендер, лишнего запроса /me нет.
  const current = await getSession();
  if (current.status === "authenticated" && current.user.telegram_id === null) {
    return { ok: false, error: "client_error", status: 409 };
  }
  return requestJson<T>(`${API_BASE_URL}${path}`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
    cache: "no-store",
  });
}

export type Profile = {
  telegram_id: number;
  user_name: string;
  phone: string | null;
  lesson_credits: number;
  registered_at: string;
  is_admin: boolean;
};

export type UserBooking = {
  id: number;
  slot_id: number;
  class_key: string;
  class_label: string;
  starts_at: string;
  booking_status: string;
  slot_status: string;
  cancellable_until: string;
  // После своей отмены — когда снова можно записаться; null — паузы нет.
  // Необязательное: старый backend поле не отдаёт.
  rebook_available_at?: string | null;
  // «Записан» / «Занятие прошло» / «Отменено вами» / «Отменено студией».
  status_label?: string;
  cancelled_by?: "user" | "studio" | null;
  // Время до последнего переноса студией; null — не переносилось.
  previous_starts_at?: string | null;
  // Причина, если студия отменила всё занятие.
  slot_cancel_reason?: string | null;
};

export type SupportTicket = {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  last_message: string;
};

export type PaymentHistoryItem = {
  id: number;
  package_key: string;
  package_title: string;
  lessons: number;
  amount_minor: number;
  status: string;
  created_at: string;
};

// Ошибка — `ApiResult` с причиной, а не `null`/`[]`: пустой список и
// "не удалось загрузить" страница показывает по-разному.
export type UserPackage = {
  kind: "payment" | "grant";
  id: number;
  package_key: string;
  title: string;
  lessons: number;
  remaining: number;
  status: string;
  status_label: string;
  acquired_at: string;
  amount_minor: number | null;
  // Когда сгорает остаток; null — бессрочно.
  expires_at: string | null;
};

export type PackageSummary = {
  balance: number;
  // Бессрочные занятия (возврат за отменённые студией занятия после срока).
  unallocated: number;
  next_source_title: string | null;
  packages: UserPackage[];
};

export function getMyPackages(): Promise<ApiResult<PackageSummary>> {
  return fetchWithSession<PackageSummary>("/api/packages/me");
}

export function getProfile(): Promise<ApiResult<Profile>> {
  return fetchWithSession<Profile>("/api/users/me/profile");
}

// cache — один запрос на рендер страницы, сколько бы помощников ниже
// ни спрашивали записи.
export const getMyBookings = cache(
  (): Promise<ApiResult<UserBooking[]>> => fetchWithSession<UserBooking[]>("/api/bookings/me"),
);

export function getMySupportTickets(): Promise<ApiResult<SupportTicket[]>> {
  return fetchWithSession<SupportTicket[]>("/api/support/me");
}

export function getMyPayments(): Promise<ApiResult<PaymentHistoryItem[]>> {
  return fetchWithSession<PaymentHistoryItem[]>("/api/payments/me");
}

/**
 * Занятия, на которые пользователь уже записан (подтверждённые записи) —
 * чтобы в расписании показывать «Вы записаны» вместо кнопки «Записаться».
 * Без сессии или при сбое API — пустой набор: тогда остаётся обычная
 * кнопка, а повторную запись backend всё равно обработает идемпотентно.
 */
export async function getMyBookedSlotIds(): Promise<Set<number>> {
  const result = await getMyBookings();
  if (!result.ok) {
    return new Set();
  }
  return new Set(
    result.data
      .filter((booking) => booking.booking_status === "confirmed")
      .map((booking) => booking.slot_id),
  );
}

/**
 * Занятия, на которые после своей отмены записаться пока нельзя (пауза из
 * правил студии): id занятия → когда станет можно. Вместо кнопки
 * «Записаться» сайт пишет «Можно через N часов».
 */
export async function getMyRebookTimes(): Promise<Map<number, string>> {
  const result = await getMyBookings();
  const times = new Map<number, string>();
  if (!result.ok) return times;
  for (const booking of result.data) {
    if (booking.rebook_available_at) times.set(booking.slot_id, booking.rebook_available_at);
  }
  return times;
}

export type WaitlistEntry = {
  slot: {
    id: number;
    class_key: string;
    class_label: string;
    starts_at: string;
    remaining: number;
    status: string;
  };
  joined_at: string;
  queue_size: number;
};

export function getMyWaitlist(): Promise<ApiResult<WaitlistEntry[]>> {
  return fetchWithSession<WaitlistEntry[]>("/api/waitlist/me");
}

export async function getMyWaitlistedSlotIds(): Promise<Set<number>> {
  const result = await getMyWaitlist();
  return new Set(result.ok ? result.data.map((entry) => entry.slot.id) : []);
}
