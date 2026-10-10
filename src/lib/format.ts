// Правила отображения данных клиенту — те же, что в Telegram-боте
// (TELEGRAM-BOT/src/flamenco_bot/presentation.py), чтобы сайт и бот выглядели как два
// интерфейса одного аккаунта: «Вт 14.10 · 19:00», «Баланс: 3 занятия».
//
// Время показывается в часовом поясе студии — та же переменная
// STUDIO_TIMEZONE и то же значение по умолчанию, что у backend
// (flamenco_bot/config: Config.STUDIO_TIMEZONE), поэтому один и тот же
// момент из PostgreSQL выглядит одинаково на сайте и в Telegram-боте.
// Форматирование выполняется на сервере Next.js; некорректное имя пояса
// роняет сервер при старте (RangeError), а не показывает неверное время.

const TIME_ZONE =
  (typeof process !== "undefined" ? process.env.STUDIO_TIMEZONE?.trim() : "") ||
  "Europe/Moscow";

export const STUDIO_TIMEZONE = TIME_ZONE;

const partsFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function zonedParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    partsFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

/** «Вт 14.10 · 19:00» в поясе студии; год — только если он не текущий. */
export function formatClassDateTime(isoString: string, now: Date = new Date()): string {
  const parts = zonedParts(new Date(isoString));
  const currentYear = zonedParts(now).year;
  const weekday = parts.weekday.charAt(0).toUpperCase() + parts.weekday.slice(1);
  const date =
    parts.year === currentYear
      ? `${parts.day}.${parts.month}`
      : `${parts.day}.${parts.month}.${parts.year}`;
  return `${weekday} ${date} · ${parts.hour}:${parts.minute}`;
}

export function plural(count: number, forms: [string, string, string]): string {
  const value = Math.abs(count) % 100;
  if (value >= 11 && value <= 14) return forms[2];
  const last = value % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

export function lessonsCount(count: number): string {
  return `${count} ${plural(count, ["занятие", "занятия", "занятий"])}`;
}

export function balanceLabel(credits: number): string {
  return `Баланс: ${lessonsCount(credits)}`;
}

export function placesLabel(count: number): string {
  return `${count} ${plural(count, ["место", "места", "мест"])}`;
}

export function daysLabel(count: number): string {
  return `${count} ${plural(count, ["день", "дня", "дней"])}`;
}

export function hoursLabel(count: number): string {
  return `${count} ${plural(count, ["час", "часа", "часов"])}`;
}

/** «3 600 ₽» — разделитель разрядов как в боте (неразрывный пробел). */
export function formatPrice(rubles: number): string {
  return `${String(Math.round(rubles)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")}\u00a0₽`;
}
