"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SERVICE_UNAVAILABLE_MESSAGE } from "./apiResult";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
const SESSION_COOKIE_NAME = "session";

// Понятная пользователю причина отказа: при 5xx (в том числе 503 «БД
// недоступна») — общее «сервис временно недоступен», а не технический
// detail backend; при 4xx — detail backend (слот занят, нет занятий на
// балансе и т.п.), он уже сформулирован для пользователя.
async function failureMessage(response: Response, fallback: string): Promise<string> {
  if (response.status >= 500) {
    return SERVICE_UNAVAILABLE_MESSAGE;
  }
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail) {
      return body.detail;
    }
  } catch {
    // используем сообщение по умолчанию
  }
  return fallback;
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (session) {
    try {
      // Сессия хранится на backend (таблица web_sessions) — без этого
      // вызова сама сессия осталась бы действительной (отозвана только
      // здесь, в cookie этого браузера, но не на сервере).
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
      });
    } catch (error) {
      console.error("Logout request to backend failed", error);
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/");
}

export async function submitSupportMessageAction(
  formData: FormData,
): Promise<void> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session) {
    redirect("/login");
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    redirect("/account/support?error=empty");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/support`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=${session.value}`,
      },
      body: JSON.stringify({ body }),
    });
  } catch (error) {
    console.error("Support submission request failed", error);
    redirect("/account/support?error=unavailable");
  }

  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    const reason =
      response.status === 429
        ? "rate_limited"
        : response.status >= 500
          ? "unavailable"
          : "failed";
    redirect(`/account/support?error=${reason}`);
  }

  redirect("/account/support?submitted=1");
}

function scheduleRedirectUrl(
  classKey: string | null,
  params: Record<string, string>,
): string {
  const search = new URLSearchParams();
  if (classKey) {
    search.set("class_key", classKey);
  }
  for (const [key, value] of Object.entries(params)) {
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `/schedule?${query}` : "/schedule";
}

export async function bookClassAction(formData: FormData): Promise<void> {
  const slotId = Number(formData.get("slot_id"));
  const classKey = (formData.get("class_key") as string | null) || null;

  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session) {
    redirect("/login");
  }
  if (!Number.isFinite(slotId) || slotId <= 0) {
    redirect(scheduleRedirectUrl(classKey, { book_error: "Некорректная запись" }));
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=${session.value}`,
      },
      body: JSON.stringify({ slot_id: slotId }),
    });
  } catch (error) {
    console.error("Booking request failed", error);
    redirect(
      scheduleRedirectUrl(classKey, {
        book_error: SERVICE_UNAVAILABLE_MESSAGE,
      }),
    );
  }

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    const detail = await failureMessage(
      response,
      "Не удалось записаться. Попробуйте ещё раз позже.",
    );
    redirect(scheduleRedirectUrl(classKey, { book_error: detail }));
  }

  const booking = (await response.json()) as { already_booked: boolean };
  redirect(
    scheduleRedirectUrl(classKey, {
      booked: String(slotId),
      already: booking.already_booked ? "1" : "0",
    }),
  );
}

export async function cancelBookingAction(formData: FormData): Promise<void> {
  const slotId = Number(formData.get("slot_id"));

  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session) {
    redirect("/login");
  }
  if (!Number.isFinite(slotId) || slotId <= 0) {
    redirect("/account/bookings?cancel_error=Некорректная запись");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/bookings/${slotId}`, {
      method: "DELETE",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
    });
  } catch (error) {
    console.error("Booking cancellation request failed", error);
    redirect(
      "/account/bookings?cancel_error=" +
        encodeURIComponent(SERVICE_UNAVAILABLE_MESSAGE),
    );
  }

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    const detail = await failureMessage(
      response,
      "Не удалось отменить запись. Попробуйте ещё раз позже.",
    );
    redirect(`/account/bookings?cancel_error=${encodeURIComponent(detail)}`);
  }

  redirect("/account/bookings?cancelled=1");
}

export async function startCheckoutAction(formData: FormData): Promise<void> {
  const packageKey = String(formData.get("package_key") ?? "");

  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session) {
    redirect("/login");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/payments/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=${session.value}`,
      },
      body: JSON.stringify({ package_key: packageKey }),
    });
  } catch (error) {
    console.error("Checkout request failed", error);
    redirect(
      "/packages?checkout_error=" +
        encodeURIComponent(SERVICE_UNAVAILABLE_MESSAGE),
    );
  }

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    // 503 «ЮKassa не настроена» — тоже 5xx: пользователю общее сообщение.
    const detail = await failureMessage(
      response,
      "Не удалось начать оплату. Попробуйте ещё раз позже.",
    );
    redirect(`/packages?checkout_error=${encodeURIComponent(detail)}`);
  }

  const checkout = (await response.json()) as { confirmation_url: string | null };
  if (!checkout.confirmation_url) {
    // ЮKassa не вернула безопасную HTTPS-ссылку — платёж уже создан в БД,
    // но вести пользователя некуда. Отправляем в историю платежей вместо
    // редиректа в никуда.
    redirect("/account/payments?checkout_error=no_confirmation_url");
  }
  redirect(checkout.confirmation_url);
}

export async function checkPaymentAction(formData: FormData): Promise<void> {
  const paymentId = Number(formData.get("payment_id"));

  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session) {
    redirect("/login");
  }
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    redirect("/account/payments");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/check`, {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
    });
  } catch (error) {
    console.error("Payment status check failed", error);
    redirect(
      `/account/payments?checkout_error=${encodeURIComponent(SERVICE_UNAVAILABLE_MESSAGE)}`,
    );
  }

  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status >= 500) {
    redirect(
      `/account/payments?checkout_error=${encodeURIComponent(SERVICE_UNAVAILABLE_MESSAGE)}`,
    );
  }

  redirect("/account/payments");
}

/** Лист ожидания: встать в очередь (``join``) или выйти из неё. */
export async function waitlistAction(formData: FormData): Promise<void> {
  const slotId = Number(formData.get("slot_id"));
  const join = formData.get("action") === "join";
  const classKey = (formData.get("class_key") as string | null) || null;
  const from = formData.get("from") === "bookings" ? "bookings" : "schedule";
  const session = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!session) {
    redirect("/login");
  }
  const target = (params: Record<string, string>) =>
    from === "bookings"
      ? `/account/bookings?${new URLSearchParams(params).toString()}`
      : scheduleRedirectUrl(classKey, params);
  if (!Number.isFinite(slotId) || slotId <= 0) {
    redirect(target({ book_error: "Некорректное занятие" }));
  }
  let response: Response;
  try {
    response = await fetch(
      join ? `${API_BASE_URL}/api/waitlist` : `${API_BASE_URL}/api/waitlist/${slotId}`,
      {
        method: join ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${session.value}`,
        },
        body: join ? JSON.stringify({ slot_id: slotId }) : undefined,
      },
    );
  } catch (error) {
    console.error("Waitlist request failed", error);
    redirect(target({ book_error: SERVICE_UNAVAILABLE_MESSAGE }));
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok && response.status !== 404) {
    redirect(
      target({
        book_error: await failureMessage(response, "Не удалось изменить лист ожидания."),
      }),
    );
  }
  redirect(target({ waitlist: join ? "joined" : "left" }));
}
