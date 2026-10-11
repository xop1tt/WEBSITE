// Режим технического обслуживания (src/lib/maintenance.ts): какие адреса
// закрываются, что отдаёт proxy, обратный отсчёт и поведение при сбоях API.
// Запуск: npm test.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  NOTICE_LEAD_MS,
  countdown,
  decideMaintenance,
  effectiveMode,
  fetchMaintenanceStatus,
  isMaintenanceExempt,
  parseNotice,
  retryAfter,
} from "../src/lib/maintenance.ts";

const NOW = Date.parse("2026-10-12T20:00:00Z");

function status(overrides = {}) {
  return {
    mode: "active",
    title: "Пауза",
    description: "Скоро вернёмся",
    starts_at: "2026-10-12T19:00:00Z",
    ends_at: "2026-10-12T21:30:00Z",
    server_time: "2026-10-12T20:00:00Z",
    retry_after: 5400,
    ...overrides,
  };
}

test("служебные маршруты открыты во время работ", () => {
  for (const path of [
    "/admin",
    "/admin/maintenance",
    "/login",
    "/maintenance",
    "/api/health",
    "/api/maintenance",
    "/_next/static/chunk.js",
    "/favicon.ico",
    "/images/hero.webp",
  ]) {
    assert.equal(isMaintenanceExempt(path), true, path);
  }
});

test("обычные страницы закрыты, обойти другим адресом нельзя", () => {
  for (const path of [
    "/",
    "/schedule",
    "/packages",
    "/contact",
    "/account",
    "/account/bookings",
    "/register",
    "/credits",
    "/administrator",
    "/login-help",
    "/maintenance-old",
  ]) {
    assert.equal(isMaintenanceExempt(path), false, path);
    assert.equal(
      decideMaintenance({ mode: "active", pathname: path, method: "GET", isRsc: false }),
      "document",
      path,
    );
  }
});

test("решения proxy по типу запроса", () => {
  const base = { mode: "active", pathname: "/schedule" };
  assert.equal(decideMaintenance({ ...base, method: "GET", isRsc: true }), "rewrite");
  assert.equal(decideMaintenance({ ...base, method: "HEAD", isRsc: false }), "document");
  assert.equal(decideMaintenance({ ...base, method: "POST", isRsc: false }), "reject");
  assert.equal(decideMaintenance({ ...base, method: "POST", isRsc: true }), "reject");
  // Админка работает, в том числе её формы (server actions).
  assert.equal(
    decideMaintenance({ mode: "active", pathname: "/admin/maintenance", method: "POST", isRsc: false }),
    "pass",
  );
  // Без работ и до их начала — обычная обработка.
  for (const mode of ["normal", "scheduled"]) {
    assert.equal(decideMaintenance({ ...base, mode, method: "GET", isRsc: false }), "pass");
  }
});

test("страница обслуживания не перенаправляет сама на себя", () => {
  // /maintenance всегда пропускается — rewrite/запрос к ней не зацикливается.
  for (const method of ["GET", "HEAD", "POST"]) {
    assert.equal(
      decideMaintenance({ mode: "active", pathname: "/maintenance", method, isRsc: false }),
      "pass",
    );
  }
});

test("работы начинаются ровно в срок, даже по ответу из кэша", () => {
  const scheduled = status({ mode: "scheduled", starts_at: "2026-10-12T20:00:00Z" });
  assert.equal(effectiveMode(scheduled, NOW - 1), "scheduled");
  assert.equal(effectiveMode(scheduled, NOW), "active");
  assert.equal(effectiveMode(null, NOW), "normal");
  // Плановое окончание прошло — обслуживание продолжается, пока его не завершат.
  assert.equal(effectiveMode(status(), Date.parse("2026-10-13T05:00:00Z")), "active");
  assert.equal(effectiveMode(status({ mode: "normal" }), NOW), "normal");
});

test("обратный отсчёт по реальному времени и без отрицательных значений", () => {
  assert.deepEqual(countdown("2026-10-12T21:30:05Z", NOW), {
    days: 0,
    hours: 1,
    minutes: 30,
    seconds: 5,
  });
  assert.deepEqual(countdown("2026-10-14T20:00:01Z", NOW), {
    days: 2,
    hours: 0,
    minutes: 0,
    seconds: 1,
  });
  // Через 10 секунд реального времени — на 10 секунд меньше.
  assert.equal(countdown("2026-10-12T21:30:05Z", NOW + 10_000).seconds, 55);
  assert.equal(countdown("2026-10-12T20:00:00Z", NOW), null);
  assert.equal(countdown("2026-10-12T19:00:00Z", NOW), null);
  assert.equal(countdown(null, NOW), null);
  assert.equal(countdown("не дата", NOW), null);
});

test("состояние с backend: успех и сбои не бросают исключений", async () => {
  const ok = await fetchMaintenanceStatus("http://api", 1000, async (url, init) => {
    assert.equal(url, "http://api/api/maintenance");
    assert.equal(init.cache, "no-store");
    assert.ok(init.signal);
    return Response.json(status());
  });
  assert.equal(ok.mode, "active");

  const failures = [
    async () => new Response("down", { status: 503 }),
    async () => new Response("<html>", { status: 200 }),
    async () => Response.json({ mode: "maybe" }),
    async () => {
      throw new TypeError("fetch failed");
    },
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason));
      }),
  ];
  for (const failing of failures) {
    assert.equal(await fetchMaintenanceStatus("http://api", 20, failing), null);
  }
});

test("Retry-After из ответа backend с ограничениями", () => {
  assert.equal(retryAfter(status()), 5400);
  assert.equal(retryAfter(null), 600);
  assert.equal(retryAfter(status({ retry_after: 10 ** 7 })), 86_400);
  assert.equal(retryAfter(status({ retry_after: 0 })), 600);
});

test("предупреждение о запланированных работах", () => {
  const soon = JSON.stringify({ starts_at: "2026-10-13T20:00:00Z", ends_at: "2026-10-13T22:00:00Z" });
  assert.deepEqual(parseNotice(soon, NOW), {
    starts_at: "2026-10-13T20:00:00Z",
    ends_at: "2026-10-13T22:00:00Z",
  });
  const far = JSON.stringify({ starts_at: new Date(NOW + NOTICE_LEAD_MS + 1000).toISOString() });
  assert.equal(parseNotice(far, NOW), null);
  const started = JSON.stringify({ starts_at: "2026-10-12T19:00:00Z" });
  assert.equal(parseNotice(started, NOW), null);
  assert.equal(parseNotice("{broken", NOW), null);
  assert.equal(parseNotice(null, NOW), null);
  const noEnd = JSON.stringify({ starts_at: "2026-10-13T20:00:00Z", ends_at: "x" });
  assert.equal(parseNotice(noEnd, NOW).ends_at, null);
});
