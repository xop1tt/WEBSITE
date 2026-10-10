"use server";

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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    back("/admin/schedule", { error: "Укажите дату и время" });
  }
  // Время вводится в часовом поясе студии (как в админке бота).
  const startsAt = `${date}T${time}:00${studioOffset(date, time)}`;
  const result = await adminRequest("POST", "/api/admin/slots", {
    class_key: classKey,
    starts_at: startsAt,
    capacity,
    teacher_telegram_id: teacher,
  });
  if (!result.ok) {
    back("/admin/schedule", { error: result.message });
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
    notice = action === "close" ? "Запись закрыта" : "Запись открыта";
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
