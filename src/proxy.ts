import { NextResponse, type NextRequest } from "next/server";
import {
  INTERNAL_REQUEST_HEADER,
  MAINTENANCE_PATH,
  NOTICE_REQUEST_HEADER,
  decideMaintenance,
  effectiveMode,
  fetchMaintenanceStatus,
  retryAfter,
  type MaintenanceStatus,
} from "@/lib/maintenance";

/**
 * Режим технического обслуживания на уровне сервера (Next.js 16 Proxy —
 * бывший Middleware). Состояние читается с backend (`GET /api/maintenance`);
 * сайт его не хранит.
 *
 * Пока обслуживание идёт, любой обычный адрес сайта отдаёт страницу
 * обслуживания — обойти её переходом на другой URL нельзя:
 * - навигация браузера и поисковые роботы — HTML /maintenance со статусом
 *   503 и Retry-After (временная недоступность: поисковики не индексируют
 *   страницу обслуживания вместо настоящих и вернутся позже). Rewrite в
 *   Next.js статус ответа не передаёт, поэтому proxy сам запрашивает
 *   отрисованную /maintenance и отдаёт её с 503; если это не удалось —
 *   обычный rewrite;
 * - клиентская навигация (RSC) — rewrite на /maintenance;
 * - отправка форм и server actions — 503 без выполнения действия.
 * Исключения — `isMaintenanceExempt` (админка, вход, /api, статика).
 *
 * Если backend не ответил, сайт работает как обычно (fail-open): страницы
 * сами показывают «сервис временно недоступен», а последнее известное
 * состояние держится ещё STALE_MS — короткий сбой API посреди работ не
 * открывает сайт.
 */

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
// Адрес самого сайта для внутреннего запроса страницы обслуживания. За
// обратным прокси (Docker + Caddy) — локальный адрес Next.js, чтобы запрос
// не шёл через внешний домен; по умолчанию — origin текущего запроса.
const SITE_INTERNAL_ORIGIN = process.env.SITE_INTERNAL_ORIGIN?.trim() || null;

const STATUS_TTL_MS = 10_000;
const STALE_MS = 5 * 60_000;
const STATUS_TIMEOUT_MS = 2_000;
const PAGE_TIMEOUT_MS = 5_000;

type CacheEntry = { status: MaintenanceStatus | null; at: number };
let cached: CacheEntry | null = null;
let inflight: Promise<MaintenanceStatus | null> | null = null;

async function currentStatus(): Promise<MaintenanceStatus | null> {
  const now = Date.now();
  if (cached && now - cached.at < STATUS_TTL_MS) {
    return cached.status;
  }
  inflight ??= fetchMaintenanceStatus(API_BASE_URL, STATUS_TIMEOUT_MS).finally(() => {
    inflight = null;
  });
  const fresh = await inflight;
  if (fresh) {
    cached = { status: fresh, at: Date.now() };
    return fresh;
  }
  // Сбой: последнее известное состояние, пока оно не слишком старое.
  if (cached && now - cached.at < STALE_MS) {
    return cached.status;
  }
  return null;
}

function maintenanceHeaders(status: MaintenanceStatus | null): Record<string, string> {
  return {
    "Retry-After": String(retryAfter(status)),
    "Cache-Control": "no-store",
  };
}

async function maintenanceDocument(
  request: NextRequest,
  status: MaintenanceStatus | null,
): Promise<NextResponse> {
  const origin = SITE_INTERNAL_ORIGIN ?? request.nextUrl.origin;
  try {
    const page = await fetch(new URL(MAINTENANCE_PATH, origin), {
      headers: {
        [INTERNAL_REQUEST_HEADER]: "1",
        accept: "text/html",
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    if (page.ok) {
      return new NextResponse(request.method === "HEAD" ? null : await page.text(), {
        status: 503,
        headers: {
          "Content-Type": page.headers.get("content-type") ?? "text/html; charset=utf-8",
          ...maintenanceHeaders(status),
        },
      });
    }
    console.error(`Maintenance page fetch failed: ${page.status}`);
  } catch (error) {
    console.error("Maintenance page fetch errored", error);
  }
  return NextResponse.rewrite(new URL(MAINTENANCE_PATH, request.url), {
    headers: maintenanceHeaders(status),
  });
}

export async function proxy(request: NextRequest) {
  const status = await currentStatus();
  const mode = effectiveMode(status, Date.now());
  const decision = decideMaintenance({
    mode,
    pathname: request.nextUrl.pathname,
    method: request.method,
    // Клиентская навигация App Router. Next.js 16 убирает заголовки RSC
    // и параметр _rsc до вызова proxy, но оставляет Next-Url — браузер при
    // обычной загрузке документа его не отправляет.
    isRsc:
      request.headers.get("rsc") === "1" ||
      request.headers.has("next-router-prefetch") ||
      request.headers.has("next-url") ||
      request.nextUrl.searchParams.has("_rsc"),
  });

  if (decision === "reject") {
    return new NextResponse("Сайт на техническом обслуживании. Попробуйте позже.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", ...maintenanceHeaders(status) },
    });
  }
  if (decision === "rewrite") {
    return NextResponse.rewrite(new URL(MAINTENANCE_PATH, request.url), {
      headers: maintenanceHeaders(status),
    });
  }
  if (decision === "document") {
    return maintenanceDocument(request, status);
  }

  // Обычная работа. Предупреждение о запланированных работах передаётся
  // странице заголовком запроса; присланный клиентом заголовок с тем же
  // именем отбрасывается.
  const headers = new Headers(request.headers);
  headers.delete(NOTICE_REQUEST_HEADER);
  headers.delete(INTERNAL_REQUEST_HEADER);
  if (mode === "scheduled" && status?.starts_at) {
    headers.set(
      NOTICE_REQUEST_HEADER,
      JSON.stringify({ starts_at: status.starts_at, ends_at: status.ends_at }),
    );
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Всё, кроме статики Next.js, изображений, запросов к backend и файлов
    // из public/ (с расширением).
    "/((?!_next/static|_next/image|api/|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
