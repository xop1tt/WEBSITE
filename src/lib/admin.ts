import { cookies } from "next/headers";
import type { PackageSummary, SupportTicket } from "./account";
import { requestJson, type ApiResult } from "./apiResult";
import { API_BASE_URL, SESSION_COOKIE_NAME } from "./backend";

/**
 * Данные админ-панели (`/api/admin/*` на backend). Права проверяет backend
 * на каждом запросе: без прав — 403, и страница показывает «нет доступа».
 */

async function adminGet<T>(path: string): Promise<ApiResult<T>> {
  const session = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!session) {
    return { ok: false, error: "unauthorized", status: null };
  }
  return requestJson<T>(`${API_BASE_URL}${path}`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
    cache: "no-store",
  });
}

export type AdminDashboard = {
  slots_today: number;
  bookings_today: number;
  free_seats_today: number;
  slots_week: number;
  bookings_week: number;
  free_seats_week: number;
  total_profiles: number;
  total_web_users: number;
  new_profiles_today: number;
  new_web_users_today: number;
  online_users: number;
  sales_today_count: number;
  sales_today_rub: number;
  sales_month_count: number;
  sales_month_rub: number;
  pending_payments: number;
  open_tickets: number;
};

export type AdminSlot = {
  id: number;
  class_key: string;
  class_label: string;
  starts_at: string;
  capacity: number;
  remaining: number;
  booked: number;
  status: "open" | "closed" | "cancelled";
  rescheduled: boolean;
  cancel_reason: string | null;
  teacher_telegram_id: number | null;
  teacher_name: string | null;
};

export type StaffMember = {
  telegram_id: number;
  role: "admin" | "teacher";
  display_name: string | null;
  user_name: string;
  public_name: string;
  phone: string | null;
  has_web_account: boolean;
  created_at: string;
};

export type AdminParticipant = {
  booking_id: number;
  telegram_id: number;
  user_name: string;
  phone: string | null;
  booked_at: string;
  status: string;
};

export type AdminAccount = {
  web_user_id: number | null;
  email: string | null;
  telegram_id: number | null;
  name: string;
  phone: string | null;
  lesson_credits: number;
  is_admin: boolean;
  role: "admin" | "teacher" | null;
  registered_at: string;
  last_seen_at: string | null;
};

export type AdminPayment = {
  id: number;
  telegram_id: number;
  user_name: string | null;
  package_title: string;
  lessons: number;
  amount_rub: number;
  status: string;
  status_label: string;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  refund_reason: string | null;
  refunded_at: string | null;
};

export type AdminPaymentsPage = { items: AdminPayment[]; next_before_id: number | null };

export type AdminBooking = {
  id: number;
  slot_id: number;
  class_label: string;
  starts_at: string;
  status: string;
  status_label: string;
  slot_cancel_reason: string | null;
};

export type AdminClientCard = {
  profile: {
    telegram_id: number;
    user_name: string;
    phone: string | null;
    lesson_credits: number;
    registered_at: string;
  };
  role: "admin" | "teacher" | null;
  email: string | null;
  has_web_account: boolean;
  packages: PackageSummary;
  upcoming: AdminBooking[];
};

export type AdminOperation = {
  id: number;
  created_at: string;
  delta: number;
  operation: string;
  label: string;
  reason: string | null;
  package_title: string | null;
  class_label: string | null;
  starts_at: string | null;
  telegram_id: number;
  user_name: string | null;
  actor_telegram_id: number | null;
};

export type AdminAuditEvent = {
  source: string;
  action: string;
  label: string;
  created_at: string;
  actor_telegram_id: number | null;
  actor_name: string | null;
  target_telegram_id: number | null;
  target_name: string | null;
  slot_id: number | null;
  payment_id: number | null;
  delta: number | null;
  reason: string | null;
};

export type AdminReconciliation = {
  checked_users: number;
  mismatched_users: number;
  mismatches: {
    telegram_id: number;
    user_name: string;
    lesson_credits: number;
    ledger_total: number;
    difference: number;
    ledger_entries: number;
  }[];
};

export type AdminTicket = {
  id: number;
  telegram_id: number;
  user_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_message: string;
};

export type AdminThread = {
  id: number;
  telegram_id: number;
  user_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  messages: { id: number; sender_role: "user" | "admin"; body: string; created_at: string }[];
};

export type AdminClassFormat = {
  key: string;
  title: string;
  short_title: string;
  description: string;
  level: string;
  sort_order: number;
  is_active: boolean;
};

export type AdminLessonPackage = {
  key: string;
  title: string;
  lessons: number;
  price_rub: number;
  validity_days: number | null;
  sort_order: number;
  is_active: boolean;
};

export type StudioRules = {
  cancellation_deadline_hours: number;
  rebook_cooldown_hours: number;
  manual_credit_validity_days: number;
  expiry_warning_days: number;
};

export const getAdminClassFormats = () => adminGet<AdminClassFormat[]>("/api/admin/classes");
export const getAdminPackages = () => adminGet<AdminLessonPackage[]>("/api/admin/packages");
export const getStudioRules = () => adminGet<StudioRules>("/api/admin/settings");
export const getAdminStaff = () => adminGet<StaffMember[]>("/api/admin/staff");
export const getAdminDashboard = () => adminGet<AdminDashboard>("/api/admin/dashboard");
export const getAdminSlots = (period?: { from: string; to: string }) =>
  adminGet<AdminSlot[]>(
    period
      ? `/api/admin/slots?${new URLSearchParams(period).toString()}`
      : "/api/admin/slots",
  );
export const getAdminParticipants = (slotId: number) =>
  adminGet<AdminParticipant[]>(`/api/admin/slots/${slotId}/participants`);
export const getAdminUsers = (query: string) =>
  adminGet<AdminAccount[]>(`/api/admin/users?q=${encodeURIComponent(query)}&limit=100`);
function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const getAdminPayments = (params: {
  status?: string;
  telegram_id?: number;
  before_id?: number;
  limit?: number;
}) => adminGet<AdminPaymentsPage>(`/api/admin/payments${query({ limit: 50, ...params })}`);
export const getAdminSlotWaitlist = (slotId: number) =>
  adminGet<{ telegram_id: number; user_name: string; phone: string | null; joined_at: string }[]>(
    `/api/admin/slots/${slotId}/waitlist`,
  );
export const getAdminClient = (telegramId: number) =>
  adminGet<AdminClientCard>(`/api/admin/clients/${telegramId}`);
export const getAdminClientBookings = (telegramId: number, offset = 0) =>
  adminGet<{ items: AdminBooking[]; next_offset: number | null }>(
    `/api/admin/clients/${telegramId}/bookings${query({ offset, limit: 20 })}`,
  );
export const getAdminClientTickets = (telegramId: number) =>
  adminGet<SupportTicket[]>(`/api/admin/clients/${telegramId}/tickets`);
export const getAdminLedger = (params: { telegram_id?: number; before_id?: number }) =>
  adminGet<{ items: AdminOperation[]; next_before_id: number | null }>(
    `/api/admin/ledger${query({ limit: 30, ...params })}`,
  );
export const getAdminAudit = (before?: string) =>
  adminGet<{ items: AdminAuditEvent[]; next_before: string | null }>(
    `/api/admin/audit${query({ before, limit: 50 })}`,
  );
export const getAdminReconciliation = () =>
  adminGet<AdminReconciliation>("/api/admin/reconciliation");
export const getAdminTickets = (status: "open" | "closed") =>
  adminGet<AdminTicket[]>(`/api/admin/support?status=${status}`);
export const getAdminThread = (ticketId: number) =>
  adminGet<AdminThread>(`/api/admin/support/${ticketId}`);
