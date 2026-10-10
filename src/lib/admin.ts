import { cookies } from "next/headers";
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
};

export const getAdminClassFormats = () => adminGet<AdminClassFormat[]>("/api/admin/classes");
export const getAdminPackages = () => adminGet<AdminLessonPackage[]>("/api/admin/packages");
export const getStudioRules = () => adminGet<StudioRules>("/api/admin/settings");
export const getAdminStaff = () => adminGet<StaffMember[]>("/api/admin/staff");
export const getAdminDashboard = () => adminGet<AdminDashboard>("/api/admin/dashboard");
export const getAdminSlots = () => adminGet<AdminSlot[]>("/api/admin/slots");
export const getAdminParticipants = (slotId: number) =>
  adminGet<AdminParticipant[]>(`/api/admin/slots/${slotId}/participants`);
export const getAdminUsers = (query: string) =>
  adminGet<AdminAccount[]>(`/api/admin/users?q=${encodeURIComponent(query)}&limit=100`);
export const getAdminPayments = () => adminGet<AdminPayment[]>("/api/admin/payments?limit=100");
export const getAdminTickets = (status: "open" | "closed") =>
  adminGet<AdminTicket[]>(`/api/admin/support?status=${status}`);
export const getAdminThread = (ticketId: number) =>
  adminGet<AdminThread>(`/api/admin/support/${ticketId}`);
