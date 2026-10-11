"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SERVICE_UNAVAILABLE_MESSAGE } from "./apiResult";
import { API_BASE_URL, backendHeaders, errorDetail } from "./backend";
import { STUDIO_TIMEZONE } from "./format";

/**
 * Изменяющие действия админ-панели. Права (роль сотрудника) проверяет
 * backend; здесь — только перенаправление с понятным сообщением.
 */

async function adminRequest(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<{ ok: true; data: unknown } | { ok: false; message: string; status: number | null }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: await backendHeaders({ "Content-Type": "application/json" }),
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`Admin request failed: ${path}`, error);
    return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE, status: null };
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    const message =
      response.status >= 500
        ? SERVICE_UNAVAILABLE_MESSAGE
        : ((await errorDetail(response)) ?? "Не удалось выполнить действие");
    return { ok: false, message, status: response.status };
  }
  return {
    ok: true,
    data: response.status === 204 ? null : await response.json().catch(() => null),
  };
}

function back(path: string, params: Record<string, string>): never {
  const search = new URLSearchParams(params).toString();
  redirect(search ? `${path}?${search}` : path);
}

/** Смещение часового пояса студии для даты (например, "+03:00"). */
function studioOffset(date: string, time: string): string {
  const probe = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIMEZONE,
    timeZoneName: "longOffset",
  }).formatToParts(probe);
  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const offset = name.replace("GMT", "");
  return offset === "" ? "+00:00" : offset;
}

/** Telegram ID из поля формы; пустое значение — null («без преподавателя»). */
function optionalId(value: FormDataEntryValue | null): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function createSlotAction(formData: FormData): Promise<void> {
  const classKey = String(formData.get("class_key") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const capacity = Number(formData.get("capacity"));
  const teacher = optionalId(formData.get("teacher_telegram_id"));
  const weeks = Math.min(12, Math.max(1, Number(formData.get("weeks")) || 1));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    back("/admin/schedule", { error: "Укажите дату и время" });
  }
  // Время вводится в часовом поясе студии (как в админке бота).
  const startsAt = `${date}T${time}:00${studioOffset(date, time)}`;
  const body = {
    class_key: classKey,
    starts_at: startsAt,
    capacity,
    teacher_telegram_id: teacher,
  };
  // Повторы раз в неделю — серией (backend пропустит уже существующие).
  const result =
    weeks > 1
      ? await adminRequest("POST", "/api/admin/slots/series", { ...body, weeks })
      : await adminRequest("POST", "/api/admin/slots", body);
  if (!result.ok) {
    back("/admin/schedule", { error: result.message });
  }
  if (weeks > 1) {
    const data = result.data as { created: unknown[]; skipped: number };
    back("/admin/schedule", {
      notice: `Создано занятий: ${data.created.length}${data.skipped ? `, пропущено (уже есть): ${data.skipped}` : ""}`,
    });
  }
  back("/admin/schedule", { notice: "Занятие создано" });
}

export async function slotAction(formData: FormData): Promise<void> {
  const slotId = Number(formData.get("slot_id"));
  const action = String(formData.get("action") ?? "");
  if (!Number.isInteger(slotId) || slotId <= 0) {
    back("/admin/schedule", { error: "Некорректное занятие" });
  }
  let result;
  let notice = "";
  if (action === "close" || action === "reopen") {
    result = await adminRequest("POST", `/api/admin/slots/${slotId}/${action}`);
    if (result.ok) {
      // Без редиректа: страница остаётся на месте, а бейдж на карточке
      // («запись открыта» / «запись закрыта») обновляется на месте.
      revalidatePath("/admin/schedule");
      return;
    }
  } else if (action === "cancel") {
    const reason = String(formData.get("reason") ?? "").trim();
    result = await adminRequest("POST", `/api/admin/slots/${slotId}/cancel`, {
      reason: reason || null,
    });
    notice = "Занятие отменено, участникам вернули занятия и отправили уведомления";
  } else if (action === "capacity") {
    result = await adminRequest("PATCH", `/api/admin/slots/${slotId}`, {
      capacity: Number(formData.get("capacity")),
    });
    notice = "Вместимость изменена";
  } else if (action === "reschedule") {
    const date = String(formData.get("date") ?? "");
    const time = String(formData.get("time") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      back("/admin/schedule", { error: "Укажите новую дату и время", slot: String(slotId) });
    }
    const reason = String(formData.get("reason") ?? "").trim();
    result = await adminRequest("PATCH", `/api/admin/slots/${slotId}`, {
      starts_at: `${date}T${time}:00${studioOffset(date, time)}`,
      reason: reason || null,
    });
    notice = "Занятие перенесено, участники получат уведомление";
  } else if (action === "teacher") {
    result = await adminRequest("PUT", `/api/admin/slots/${slotId}/teacher`, {
      teacher_telegram_id: optionalId(formData.get("teacher_telegram_id")),
    });
    notice = "Преподаватель изменён";
  } else {
    back("/admin/schedule", { error: "Неизвестное действие" });
  }
  if (!result.ok) {
    back("/admin/schedule", { error: result.message, slot: String(slotId) });
  }
  back("/admin/schedule", { notice, slot: String(slotId) });
}

export async function supportReplyAction(formData: FormData): Promise<void> {
  const ticketId = Number(formData.get("ticket_id"));
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    back("/admin/support", { error: "Некорректное обращение" });
  }
  const body = String(formData.get("body") ?? "").trim();
  const path = `/admin/support/${ticketId}`;
  if (!body) {
    back(path, { error: "Введите ответ" });
  }
  const result = await adminRequest("POST", `/api/admin/support/${ticketId}/reply`, { body });
  if (!result.ok) {
    back(path, { error: result.message });
  }
  const status = (result.data as { status?: string } | null)?.status;
  back(path, {
    notice:
      status === "delivered"
        ? "Ответ доставлен в Telegram"
        : "Ответ сохранён, но Telegram не доставил его (возможно, участник заблокировал бота)",
  });
}

export async function supportCloseAction(formData: FormData): Promise<void> {
  const ticketId = Number(formData.get("ticket_id"));
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    back("/admin/support", { error: "Некорректное обращение" });
  }
  const result = await adminRequest("POST", `/api/admin/support/${ticketId}/close`);
  if (!result.ok) {
    back(`/admin/support/${ticketId}`, { error: result.message });
  }
  back("/admin/support", { notice: `Обращение №${ticketId} закрыто` });
}

export async function staffRoleAction(formData: FormData): Promise<void> {
  const telegramId = Number(formData.get("telegram_id"));
  const role = String(formData.get("role") ?? "");
  if (!Number.isInteger(telegramId) || telegramId <= 0) {
    back("/admin/staff", { error: "Telegram ID — положительное целое число" });
  }
  if (role !== "admin" && role !== "teacher") {
    back("/admin/staff", { error: "Выберите роль" });
  }
  const displayName = String(formData.get("display_name") ?? "").trim();
  const result = await adminRequest("PUT", `/api/admin/staff/${telegramId}`, {
    role,
    display_name: displayName || null,
  });
  if (!result.ok) {
    back("/admin/staff", { error: result.message });
  }
  back("/admin/staff", { notice: "Роль сохранена" });
}

export async function staffRemoveAction(formData: FormData): Promise<void> {
  const telegramId = Number(formData.get("telegram_id"));
  if (!Number.isInteger(telegramId) || telegramId <= 0) {
    back("/admin/staff", { error: "Некорректный сотрудник" });
  }
  const result = await adminRequest("DELETE", `/api/admin/staff/${telegramId}`);
  if (!result.ok) {
    back("/admin/staff", { error: result.message });
  }
  back("/admin/staff", { notice: "Роль снята" });
}

function intField(formData: FormData, name: string): number {
  return Number(String(formData.get(name) ?? "").trim());
}

/** Направление: создание (`create` = "1") или изменение по ключу. */
export async function classFormatAction(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "").trim();
  const create = formData.get("create") === "1";
  const result = await adminRequest(
    create ? "POST" : "PUT",
    create ? "/api/admin/classes" : `/api/admin/classes/${encodeURIComponent(key)}`,
    {
      key,
      title: String(formData.get("title") ?? "").trim(),
      short_title: String(formData.get("short_title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      level: String(formData.get("level") ?? "").trim(),
      sort_order: intField(formData, "sort_order") || 0,
      is_active: formData.get("is_active") === "on",
    },
  );
  if (!result.ok) {
    back("/admin/catalog", { error: result.message });
  }
  back("/admin/catalog", { notice: create ? "Направление добавлено" : "Направление сохранено" });
}

/** Абонемент: создание или изменение; пустой срок — бессрочно. */
export async function packageAction(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "").trim();
  const create = formData.get("create") === "1";
  const validity = String(formData.get("validity_days") ?? "").trim();
  const result = await adminRequest(
    create ? "POST" : "PUT",
    create ? "/api/admin/packages" : `/api/admin/packages/${encodeURIComponent(key)}`,
    {
      key,
      title: String(formData.get("title") ?? "").trim(),
      lessons: intField(formData, "lessons"),
      price_rub: intField(formData, "price_rub"),
      validity_days: validity ? Number(validity) : null,
      sort_order: intField(formData, "sort_order") || 0,
      is_active: formData.get("is_active") === "on",
    },
  );
  if (!result.ok) {
    back("/admin/catalog", { error: result.message });
  }
  back("/admin/catalog", { notice: create ? "Абонемент добавлен" : "Абонемент сохранён" });
}

export async function studioRulesAction(formData: FormData): Promise<void> {
  const result = await adminRequest("PUT", "/api/admin/settings", {
    cancellation_deadline_hours: intField(formData, "cancellation_deadline_hours"),
    rebook_cooldown_hours: intField(formData, "rebook_cooldown_hours"),
    manual_credit_validity_days: intField(formData, "manual_credit_validity_days"),
    expiry_warning_days: intField(formData, "expiry_warning_days"),
  });
  if (!result.ok) {
    back("/admin/settings", { error: result.message });
  }
  back("/admin/settings", { notice: "Правила сохранены и уже действуют" });
}

export async function supportReopenAction(formData: FormData): Promise<void> {
  const ticketId = Number(formData.get("ticket_id"));
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    back("/admin/support", { error: "Некорректное обращение" });
  }
  const result = await adminRequest("POST", `/api/admin/support/${ticketId}/reopen`);
  if (!result.ok) {
    back(`/admin/support/${ticketId}`, { error: result.message });
  }
  back(`/admin/support/${ticketId}`, { notice: "Обращение снова открыто" });
}

/** Карточка участника: страница для возврата и путь API. */
function clientPaths(formData: FormData): { path: string; api: string } {
  const telegramId = Number(formData.get("telegram_id"));
  if (!Number.isInteger(telegramId) || telegramId <= 0) {
    back("/admin/users", { error: "Некорректный участник" });
  }
  return { path: `/admin/users/${telegramId}`, api: `/api/admin/clients/${telegramId}` };
}

export async function clientProfileAction(formData: FormData): Promise<void> {
  const { path, api } = clientPaths(formData);
  const result = await adminRequest("PATCH", `${api}/profile`, {
    user_name: String(formData.get("user_name") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
  });
  if (!result.ok) {
    back(path, { error: result.message });
  }
  back(path, { notice: "Профиль сохранён" });
}

export async function grantPackageAction(formData: FormData): Promise<void> {
  const { path, api } = clientPaths(formData);
  const result = await adminRequest("POST", `${api}/grants`, {
    package_key: String(formData.get("package_key") ?? ""),
    reason: String(formData.get("reason") ?? "").trim(),
    // Ключ формы: повторная отправка той же формы ничего не начислит.
    idempotence_key: String(formData.get("idempotence_key") ?? ""),
  });
  if (!result.ok) {
    back(path, { error: result.message });
  }
  const applied = (result.data as { applied?: boolean } | null)?.applied;
  back(path, { notice: applied ? "Абонемент выдан, участник уведомлён" : "Эта выдача уже была сделана" });
}

export async function revokeGrantAction(formData: FormData): Promise<void> {
  const { path } = clientPaths(formData);
  const grantId = Number(formData.get("grant_id"));
  const result = await adminRequest("POST", `/api/admin/grants/${grantId}/revoke`, {
    reason: String(formData.get("reason") ?? "").trim(),
  });
  if (!result.ok) {
    back(path, { error: result.message });
  }
  const lessons = (result.data as { lessons?: number } | null)?.lessons ?? 0;
  back(path, { notice: `Абонемент отозван, списано занятий: ${lessons}` });
}

export async function adjustCreditsAction(formData: FormData): Promise<void> {
  const { path, api } = clientPaths(formData);
  const sign = formData.get("sign") === "-" ? -1 : 1;
  const amount = Number(formData.get("amount"));
  const result = await adminRequest("POST", `${api}/credits`, {
    delta: sign * amount,
    reason: String(formData.get("reason") ?? "").trim(),
    idempotence_key: String(formData.get("idempotence_key") ?? ""),
  });
  if (!result.ok) {
    back(path, { error: result.message });
  }
  const applied = (result.data as { applied?: boolean } | null)?.applied;
  back(path, { notice: applied ? "Баланс изменён, участник уведомлён" : "Эта корректировка уже была применена" });
}

/** Платёж: возврат, сверка возврата или сверка оплаты с ЮKassa. */
export async function paymentAction(formData: FormData): Promise<void> {
  const paymentId = Number(formData.get("payment_id"));
  const action = String(formData.get("action") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/admin/payments");
  const path = returnTo.startsWith("/admin/") ? returnTo : "/admin/payments";
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    back(path, { error: "Некорректный платёж" });
  }
  let result;
  if (action === "refund") {
    result = await adminRequest("POST", `/api/admin/payments/${paymentId}/refund`, {
      reason: String(formData.get("reason") ?? "").trim() || "Возврат по решению студии",
    });
  } else if (action === "refund-check") {
    result = await adminRequest("POST", `/api/admin/payments/${paymentId}/refund-check`);
  } else if (action === "check") {
    result = await adminRequest("POST", `/api/admin/payments/${paymentId}/check`);
  } else {
    back(path, { error: "Неизвестное действие" });
  }
  if (!result.ok) {
    back(path, { error: result.message });
  }
  const message = (result.data as { message?: string } | null)?.message ?? "Готово";
  back(path, { notice: `Платёж №${paymentId}: ${message}` });
}

export async function copyWeekAction(formData: FormData): Promise<void> {
  const weekStart = String(formData.get("week_start") ?? "");
  const weeks = Number(formData.get("weeks"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    back("/admin/schedule", { error: "Укажите неделю" });
  }
  const result = await adminRequest("POST", "/api/admin/slots/copy-week", {
    week_start: weekStart,
    weeks,
  });
  if (!result.ok) {
    back("/admin/schedule", { error: result.message });
  }
  const data = result.data as { created: unknown[]; skipped: number };
  back("/admin/schedule", {
    notice: `Скопировано занятий: ${data.created.length}${data.skipped ? `, пропущено: ${data.skipped}` : ""}`,
  });
}

/** Запись участника администратором (те же правила, что у самозаписи). */
export async function adminBookAction(formData: FormData): Promise<void> {
  const { path, api } = clientPaths(formData);
  const slotId = Number(formData.get("slot_id"));
  const result = await adminRequest("POST", `${api}/bookings`, { slot_id: slotId });
  if (!result.ok) {
    back(path, { error: result.message });
  }
  back(path, { notice: "Участник записан, занятие списано, уведомление отправлено" });
}

/** Отмена записи администратором: всегда с возвратом занятия. */
export async function adminCancelBookingAction(formData: FormData): Promise<void> {
  const { path, api } = clientPaths(formData);
  const slotId = Number(formData.get("slot_id"));
  const result = await adminRequest("POST", `${api}/bookings/${slotId}/cancel`);
  if (!result.ok) {
    back(path, { error: result.message });
  }
  const message = (result.data as { message?: string } | null)?.message ?? "Готово";
  back(path, { notice: message });
}

function segmentParams(formData: FormData, segment: string): Record<string, unknown> {
  if (segment === "with_credits") {
    const days = Number(formData.get("inactive_days"));
    return days > 0 ? { inactive_days: days } : {};
  }
  if (segment === "slot") return { slot_id: Number(formData.get("slot_id")) };
  if (segment === "direction") {
    return { class_key: String(formData.get("class_key") ?? ""), days: Number(formData.get("days")) || 60 };
  }
  return {};
}

/** Сколько человек получит рассылку — без перезагрузки формы (набранный
 *  текст не теряется). */
export async function broadcastRecipientsAction(
  formData: FormData,
): Promise<{ recipients: number } | { error: string }> {
  const segment = String(formData.get("segment") ?? "all");
  const result = await adminRequest("POST", "/api/admin/broadcasts/preview", {
    segment,
    params: segmentParams(formData, segment),
  });
  if (!result.ok) return { error: result.message };
  return { recipients: (result.data as { recipients: number }).recipients };
}

/** Рассылка: ``preview`` — только посчитать получателей, ``send`` — отправить. */
export async function broadcastAction(formData: FormData): Promise<void> {
  const segment = String(formData.get("segment") ?? "all");
  const mode = String(formData.get("mode") ?? "send");
  const returnTo = String(formData.get("return_to") ?? "/admin/broadcasts");
  const path = returnTo.startsWith("/admin/") ? returnTo : "/admin/broadcasts";
  const params = segmentParams(formData, segment);
  if (mode === "preview") {
    const result = await adminRequest("POST", "/api/admin/broadcasts/preview", { segment, params });
    if (!result.ok) back(path, { error: result.message });
    const count = (result.data as { recipients: number }).recipients;
    back(path, { notice: `Получателей: ${count}` });
  }
  const result = await adminRequest("POST", "/api/admin/broadcasts", {
    segment,
    params,
    body: String(formData.get("body") ?? "").trim(),
  });
  if (!result.ok) back(path, { error: result.message });
  const count = (result.data as { recipients: number }).recipients;
  back(path, { notice: `Рассылка поставлена в очередь: ${count} получателей` });
}

export async function addNoteAction(formData: FormData): Promise<void> {
  const { path, api } = clientPaths(formData);
  const result = await adminRequest("POST", `${api}/notes`, {
    body: String(formData.get("body") ?? "").trim(),
  });
  if (!result.ok) back(path, { error: result.message });
  back(path, { notice: "Заметка добавлена" });
}

export async function deleteNoteAction(formData: FormData): Promise<void> {
  const { path, api } = clientPaths(formData);
  const noteId = Number(formData.get("note_id"));
  const result = await adminRequest("DELETE", `${api}/notes/${noteId}`);
  if (!result.ok) back(path, { error: result.message });
  back(path, { notice: "Заметка удалена" });
}

// ---------- техническое обслуживание сайта ----------

const MAINTENANCE_PATH = "/admin/maintenance";

/** Дата и время из полей формы (время студии) → ISO со смещением; пусто — null. */
function studioDateTime(formData: FormData, prefix: string): string | null | "invalid" {
  const date = String(formData.get(`${prefix}_date`) ?? "").trim();
  const time = String(formData.get(`${prefix}_time`) ?? "").trim();
  if (!date && !time) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return "invalid";
  return `${date}T${time}:00${studioOffset(date, time)}`;
}

/** Моменты предупреждений: отмеченные варианты и свои значения (минуты). */
function warningMinutes(formData: FormData): number[] | "invalid" {
  if (formData.get("warnings_enabled") !== "on") return [];
  const values = formData.getAll("warning").map((value) => Number(value));
  const custom = String(formData.get("warning_custom") ?? "").trim();
  if (custom) {
    for (const part of custom.split(/[\s,;]+/).filter(Boolean)) {
      values.push(Number(part));
    }
  }
  if (values.some((value) => !Number.isInteger(value) || value <= 0)) return "invalid";
  return [...new Set(values)].sort((a, b) => b - a);
}

type MaintenanceForm = {
  title: string;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  warning_minutes: number[];
  notify_users: boolean;
  audience: "all" | "staff";
};

function maintenanceForm(formData: FormData): MaintenanceForm {
  const startsAt = studioDateTime(formData, "starts");
  const endsAt = studioDateTime(formData, "ends");
  const minutes = warningMinutes(formData);
  if (startsAt === "invalid" || endsAt === "invalid") {
    back(MAINTENANCE_PATH, { error: "Укажите дату и время полностью" });
  }
  if (minutes === "invalid") {
    back(MAINTENANCE_PATH, { error: "Моменты предупреждений — целое число минут" });
  }
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    starts_at: startsAt,
    ends_at: endsAt,
    warning_minutes: minutes,
    notify_users: formData.get("notify_users") === "on",
    audience: formData.get("audience") === "staff" ? "staff" : "all",
  };
}

export async function createMaintenanceAction(formData: FormData): Promise<void> {
  const mode = String(formData.get("mode") ?? "schedule");
  const form = maintenanceForm(formData);
  const draft = { ...form, start_now: mode === "start_now" };
  if (!draft.start_now && !draft.starts_at) {
    back(MAINTENANCE_PATH, { error: "Укажите дату и время начала" });
  }
  if (mode === "preview") {
    const result = await adminRequest("POST", "/api/admin/maintenance/preview", draft);
    if (!result.ok) back(MAINTENANCE_PATH, { error: result.message });
    // Черновик — в адресе: страница покажет тексты и расписание, ничего не
    // сохраняя и не отправляя.
    back(MAINTENANCE_PATH, {
      preview: Buffer.from(JSON.stringify(draft)).toString("base64url"),
    });
  }
  const result = await adminRequest("POST", "/api/admin/maintenance", draft);
  if (!result.ok) back(MAINTENANCE_PATH, { error: result.message });
  back(MAINTENANCE_PATH, {
    notice: draft.start_now
      ? "Обслуживание включено: сайт показывает страницу технических работ"
      : "Обслуживание запланировано",
  });
}

export async function updateMaintenanceAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const phase = String(formData.get("phase") ?? "scheduled");
  const form = maintenanceForm(formData);
  const changed = (prefix: "starts" | "ends") =>
    `${formData.get(`${prefix}_date`) ?? ""} ${formData.get(`${prefix}_time`) ?? ""}`.trim() !==
    String(formData.get(`orig_${prefix}`) ?? "").trim();
  // Время — только изменённое; во время работ — тексты и окончание.
  const body: Partial<MaintenanceForm> =
    phase === "active"
      ? { title: form.title, description: form.description }
      : { ...form };
  if (!changed("starts") || phase === "active") delete body.starts_at;
  if (changed("ends")) body.ends_at = form.ends_at;
  else delete body.ends_at;
  const result = await adminRequest("PATCH", `/api/admin/maintenance/${id}`, body);
  if (!result.ok) back(MAINTENANCE_PATH, { error: result.message });
  back(MAINTENANCE_PATH, { notice: "Изменения сохранены" });
}

const MAINTENANCE_TRANSITIONS: Record<string, string> = {
  start: "Обслуживание включено: сайт показывает страницу технических работ",
  complete: "Работы завершены: сайт снова работает, участники получат уведомление",
  cancel: "Обслуживание отменено",
};

export async function maintenanceTransitionAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const action = String(formData.get("action") ?? "");
  if (!Number.isInteger(id) || id <= 0 || !(action in MAINTENANCE_TRANSITIONS)) {
    back(MAINTENANCE_PATH, { error: "Некорректное действие" });
  }
  const result = await adminRequest("POST", `/api/admin/maintenance/${id}/${action}`);
  if (!result.ok) back(MAINTENANCE_PATH, { error: result.message });
  back(MAINTENANCE_PATH, { notice: MAINTENANCE_TRANSITIONS[action] });
}
