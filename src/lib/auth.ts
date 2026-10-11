import { cache } from "react";
import { cookies } from "next/headers";
import { requestJson } from "./apiResult";

/**
 * Авторизация пользователя сайта (`/api/auth/*` на backend — см.
 * `TELEGRAM-BOT/src/flamenco_bot/api/routers/auth.py`). Сессия —
 * httponly-cookie `session` с непрозрачным токеном, который backend проверяет
 * по таблице `web_sessions`; фронтенд её не парсит и не проверяет сам, только
 * пересылает backend'у и спрашивает "кто я".
 */

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
const SESSION_COOKIE_NAME = "session";

export type CurrentUser = {
  id: number;
  email: string | null;
  telegram_id: number | null;
  display_name: string;
  created_at: string;
  // Только для отображения (ссылка на админку и её разделы):
  // права проверяет backend на каждом /api/admin/*.
  is_admin: boolean;
  // Роль сотрудника студии; null — не сотрудник.
  role: StaffRole | null;
};

export type StaffRole = "admin" | "teacher";

/**
 * - `authenticated` — backend подтвердил сессию;
 * - `anonymous` — cookie нет или backend ответил 401 (→ /login);
 * - `unavailable` — backend не ответил или ответил 5xx: выходить из
 *   аккаунта и отправлять на /login из-за этого нельзя.
 */
export type SessionState =
  | { status: "authenticated"; user: CurrentUser }
  | { status: "anonymous" }
  | { status: "unavailable" };

/**
 * Читает сессию на сервере (Server Component), пересылая cookie бэкенду
 * напрямую (не через rewrite в next.config.ts — тот нужен для запросов из
 * браузера, а не сервер-сервер). `cache` — один запрос /me на рендер, сколько
 * бы компонентов (шапка, окно администратора, страница) ни спрашивали.
 */
export const getSession = cache(async function getSession(): Promise<SessionState> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session) {
    return { status: "anonymous" };
  }
  const result = await requestJson<CurrentUser>(`${API_BASE_URL}/api/auth/me`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
    cache: "no-store",
  });
  if (result.ok) {
    return { status: "authenticated", user: result.data };
  }
  return result.error === "unauthorized"
    ? { status: "anonymous" }
    : { status: "unavailable" };
});

/** Текущий пользователь или `null` — для шапки и публичных страниц. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  return session.status === "authenticated" ? session.user : null;
}
