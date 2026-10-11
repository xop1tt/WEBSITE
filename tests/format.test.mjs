// Контракт отображения времени: сайт показывает время в поясе студии.
// Те же контрольные точки проверяет backend (TELEGRAM-BOT,
// tests/unit/test_studio_time.py) — один и тот же момент из PostgreSQL
// выглядит одинаково на сайте и в Telegram-боте.
import assert from "node:assert/strict";
import { test } from "node:test";

delete process.env.STUDIO_TIMEZONE;
const { formatClassDateTime } = await import("../src/lib/format.ts");

const NOW = new Date("2026-10-01T09:00:00Z");

const CONTRACT = [
  ["2026-10-08T16:00:00Z", "Чт 08.10 · 19:00"],
  // Переход через полночь: в UTC ещё четверг, у студии уже пятница.
  ["2026-10-08T22:30:00Z", "Пт 09.10 · 01:30"],
  // Переход через год: дата студии уже в следующем году — год показывается.
  ["2026-12-31T21:30:00Z", "Пт 01.01.2027 · 00:30"],
];

for (const [iso, expected] of CONTRACT) {
  test(`по умолчанию Europe/Moscow: ${iso} → ${expected}`, () => {
    assert.equal(formatClassDateTime(iso, NOW), expected);
  });
}

test("срок отмены (за 24 часа) — в поясе студии", () => {
  // Начало 08.10 16:00 UTC → срок 07.10 16:00 UTC → 19:00 по Москве.
  assert.equal(formatClassDateTime("2026-10-07T16:00:00Z", NOW), "Ср 07.10 · 19:00");
});

test("STUDIO_TIMEZONE задаёт пояс; правила — из tz database, не фиксированный сдвиг", async () => {
  process.env.STUDIO_TIMEZONE = "Europe/Berlin";
  const berlin = await import("../src/lib/format.ts?berlin");
  assert.equal(berlin.formatClassDateTime("2026-07-01T16:00:00Z", NOW), "Ср 01.07 · 18:00");
  assert.equal(berlin.formatClassDateTime("2026-01-15T16:00:00Z", NOW), "Чт 15.01 · 17:00");
  delete process.env.STUDIO_TIMEZONE;
});

const { formatPhone } = await import("../src/lib/format.ts");

test("formatPhone: российский номер в привычном виде, остальные — с «+»", () => {
  assert.equal(formatPhone("89001234567"), "+7 (900) 123-45-67");
  assert.equal(formatPhone("+7 900 123 45 67"), "+7 (900) 123-45-67");
  assert.equal(formatPhone("9001234567"), "+7 (900) 123-45-67");
  assert.equal(formatPhone("37443136288"), "+37443136288");
  assert.equal(formatPhone("не скажу"), "не скажу");
  assert.equal(formatPhone(null), "—");
});

const { groupByWeekAndDay, formatWeekRange, formatStudioDay, weekStartOf } = await import(
  "../src/lib/format.ts"
);

test("неделя начинается с понедельника, подписи — по-русски", () => {
  assert.equal(weekStartOf("2026-10-12"), "2026-10-12"); // понедельник
  assert.equal(weekStartOf("2026-10-18"), "2026-10-12"); // воскресенье
  assert.equal(formatWeekRange("2026-10-12"), "12–18 октября");
  assert.equal(formatWeekRange("2026-10-26"), "26 октября – 1 ноября");
  assert.equal(formatStudioDay("2026-10-12"), "Понедельник, 12 октября");
});

test("groupByWeekAndDay: день и неделя — по времени студии, а не UTC", () => {
  const slots = [
    { id: 1, starts_at: "2026-10-12T17:00:00Z" }, // Пн 20:00 МСК
    { id: 2, starts_at: "2026-10-18T22:30:00Z" }, // в UTC воскресенье, у студии Пн 19.10 01:30
    { id: 3, starts_at: "2026-10-19T16:00:00Z" }, // Пн 19.10
  ];
  const weeks = groupByWeekAndDay(slots);
  assert.deepEqual(
    weeks.map((w) => [w.week, w.count, w.days.map((d) => [d.day, d.items.map((s) => s.id)])]),
    [
      ["2026-10-12", 1, [["2026-10-12", [1]]]],
      ["2026-10-19", 2, [["2026-10-19", [2, 3]]]],
    ],
  );
});
