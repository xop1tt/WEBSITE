/**
 * Техническое обслуживание сайта: общие правила для proxy, страницы
 * /maintenance и обратного отсчёта.
 *
 * Состояние хранит backend (`GET /api/maintenance`, таблица
 * `site_maintenance`) — сайт его не дублирует, только читает. Окно с
 * наступившим началом backend уже отдаёт как `active`; сайт дополнительно
 * сам сравнивает `starts_at` с часами, чтобы переключиться ровно в срок,
 * даже если ответ взят из короткого кэша.
 *
 * Модуль без зависимостей от Next.js — его проверяют `node --test`
 * (tests/maintenance.test.mjs).
 */

export type MaintenanceMode = "normal" | "scheduled" | "active";

export type MaintenanceStatus = {
  mode: MaintenanceMode;
  title: string | null;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  server_time: string;
  retry_after: number;
};

// Тексты по умолчанию — если backend недоступен, а страница обслуживания уже
// показывается (например, ответ из кэша proxy). Совпадают с backend
// (flamenco_bot/maintenance.py).
export const DEFAULT_MAINTENANCE_TITLE = "Небольшая пауза для больших улучшений";
export const DEFAULT_MAINTENANCE_DESCRIPTION =
  "Мы обновляем Mirada Studio, чтобы сделать занятия и запись на них ещё удобнее. Сайт временно недоступен. Скоро вернёмся!";
export const NO_END_MESSAGE =
  "Работы продолжаются. Мы сообщим, когда сайт снова будет доступен.";

export const MAINTENANCE_PATH = "/maintenance";
// Пометка внутреннего запроса proxy к странице обслуживания (за ответом со
// статусом 503) — только для логов и отладки. Обхода не даёт: внутренний
// запрос идёт на /maintenance, которая и так в исключениях, а решение по
// остальным адресам от заголовков клиента не зависит.
export const INTERNAL_REQUEST_HEADER = "x-maintenance-internal";
// Заголовок запроса к страницам, который proxy ставит при запланированных
// работах: по нему layout показывает ненавязчивое предупреждение.
export const NOTICE_REQUEST_HEADER = "x-maintenance-notice";

/**
 * Маршруты, которые работают и во время обслуживания: админка (управление
 * обслуживанием), вход (без него администратор не попадёт в админку),
 * сама страница обслуживания и запросы к backend (`/api/*` — в том числе
 * health-check). Статические файлы и `/_next/*` proxy не обрабатывает
 * вовсе (matcher в src/proxy.ts).
 */
export function isMaintenanceExempt(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/login" ||
    pathname === MAINTENANCE_PATH ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/.well-known/") ||
    // Файлы из public/ (favicon.ico, изображения) — с расширением.
    /\/[^/]+\.[a-z0-9]+$/i.test(pathname)
  );
}

/** Режим с учётом часов: запланированное с наступившим началом — активно. */
export function effectiveMode(status: MaintenanceStatus | null, nowMs: number): MaintenanceMode {
  if (!status) return "normal";
  if (status.mode === "scheduled" && status.starts_at && Date.parse(status.starts_at) <= nowMs) {
    return "active";
  }
  return status.mode;
}

export type ProxyDecision =
  // обычная обработка
  | "pass"
  // показать страницу обслуживания (клиентская навигация, RSC)
  | "rewrite"
  // полный HTML страницы обслуживания со статусом 503
  | "document"
  // изменяющий запрос (форма, server action) — 503 без страницы
  | "reject";

export function decideMaintenance(input: {
  mode: MaintenanceMode;
  pathname: string;
  method: string;
  isRsc: boolean;
}): ProxyDecision {
  if (input.mode !== "active" || isMaintenanceExempt(input.pathname)) {
    return "pass";
  }
  if (input.method !== "GET" && input.method !== "HEAD") {
    return "reject";
  }
  return input.isRsc ? "rewrite" : "document";
}

function isStatus(value: unknown): value is MaintenanceStatus {
  const data = value as Partial<MaintenanceStatus> | null;
  return (
    !!data &&
    (data.mode === "normal" || data.mode === "scheduled" || data.mode === "active") &&
    typeof data.server_time === "string"
  );
}

/**
 * Состояние обслуживания с backend; `null` — не удалось узнать (таймаут,
 * сеть, 5xx, неожиданный ответ). Ошибка не бросается: вызывающий решает,
 * что показать, — бесконечной загрузки не бывает.
 */
export async function fetchMaintenanceStatus(
  apiBaseUrl: string,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<MaintenanceStatus | null> {
  try {
    const response = await fetchImpl(`${apiBaseUrl}/api/maintenance`, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return isStatus(data) ? data : null;
  } catch {
    return null;
  }
}

export type Countdown = { days: number; hours: number; minutes: number; seconds: number };

/**
 * Оставшееся до предполагаемого окончания время по реальным часам
 * (`nowMs`, с поправкой на часы сервера). `null` — окончание неизвестно или
 * уже прошло: отрицательный отсчёт не показывается.
 */
export function countdown(endsAt: string | null, nowMs: number): Countdown | null {
  if (!endsAt) return null;
  const end = Date.parse(endsAt);
  if (Number.isNaN(end)) return null;
  const left = Math.floor((end - nowMs) / 1000);
  if (left <= 0) return null;
  return {
    days: Math.floor(left / 86_400),
    hours: Math.floor((left % 86_400) / 3600),
    minutes: Math.floor((left % 3600) / 60),
    seconds: left % 60,
  };
}

/** Секунды для заголовка Retry-After ответа 503. */
export function retryAfter(status: MaintenanceStatus | null): number {
  const value = status?.retry_after;
  return typeof value === "number" && value > 0 ? Math.min(Math.round(value), 86_400) : 600;
}

// Предупреждение о запланированных работах показывается не раньше чем за
// столько до начала.
export const NOTICE_LEAD_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Время запланированных работ из заголовка, который ставит proxy; `null` —
 * заголовка нет, он испорчен, до работ ещё далеко или они уже начались.
 */
export function parseNotice(
  raw: string | null,
  nowMs: number,
): { starts_at: string; ends_at: string | null } | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { starts_at?: unknown; ends_at?: unknown };
    if (typeof data.starts_at !== "string") return null;
    const start = Date.parse(data.starts_at);
    if (Number.isNaN(start) || start <= nowMs || start - nowMs > NOTICE_LEAD_MS) return null;
    const endsAt = typeof data.ends_at === "string" && !Number.isNaN(Date.parse(data.ends_at))
      ? data.ends_at
      : null;
    return { starts_at: data.starts_at, ends_at: endsAt };
  } catch {
    return null;
  }
}
