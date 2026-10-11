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

/**
 * Телефон для показа: в профиле он хранится как ввели («37443136288»,
 * «89001234567»). Российский номер — «+7 (900) 123-45-67», остальные — с
 * «+» впереди; то, что на номер не похоже, — как есть.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return raw;
  if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) {
    const d = digits.slice(1);
    return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
  }
  if (digits.length === 10 && digits[0] === "9") {
    return formatPhone(`7${digits}`);
  }
  return `+${digits}`;
}

// ---------- Группировка занятий по неделям и дням (пояс студии) ----------

const DAY_MS = 86_400_000;
const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const WEEKDAYS_FULL = [
  "Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота",
];

/** Календарная дата момента в поясе студии: «2026-10-12». */
export function studioDate(isoString: string): string {
  const parts = zonedParts(new Date(isoString));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function ymdToUtc(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

function utcToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Понедельник недели, в которую попадает дата. */
export function weekStartOf(ymd: string): string {
  const date = ymdToUtc(ymd);
  const shift = (date.getUTCDay() + 6) % 7; // Пн → 0 … Вс → 6
  return utcToYmd(new Date(date.getTime() - shift * DAY_MS));
}

/** «12–18 октября», а через границу месяца — «26 октября – 1 ноября». */
export function formatWeekRange(mondayYmd: string): string {
  const start = ymdToUtc(mondayYmd);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const startMonth = MONTHS_GENITIVE[start.getUTCMonth()];
  const endMonth = MONTHS_GENITIVE[end.getUTCMonth()];
  return startMonth === endMonth
    ? `${start.getUTCDate()}–${end.getUTCDate()} ${endMonth}`
    : `${start.getUTCDate()} ${startMonth} – ${end.getUTCDate()} ${endMonth}`;
}

/** «Понедельник, 12 октября». */
export function formatStudioDay(ymd: string): string {
  const date = ymdToUtc(ymd);
  return `${WEEKDAYS_FULL[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS_GENITIVE[date.getUTCMonth()]}`;
}

export type DayGroup<T> = { day: string; items: T[] };
export type WeekGroup<T> = { week: string; days: DayGroup<T>[]; count: number };

/** Занятия (уже по возрастанию времени) → недели → дни, по времени студии. */
export function groupByWeekAndDay<T extends { starts_at: string }>(items: T[]): WeekGroup<T>[] {
  const weeks: WeekGroup<T>[] = [];
  for (const item of items) {
    const day = studioDate(item.starts_at);
    const week = weekStartOf(day);
    let weekGroup = weeks[weeks.length - 1];
    if (!weekGroup || weekGroup.week !== week) {
      weekGroup = { week, days: [], count: 0 };
      weeks.push(weekGroup);
    }
    let dayGroup = weekGroup.days[weekGroup.days.length - 1];
    if (!dayGroup || dayGroup.day !== day) {
      dayGroup = { day, items: [] };
      weekGroup.days.push(dayGroup);
    }
    dayGroup.items.push(item);
    weekGroup.count += 1;
  }
  return weeks;
}
