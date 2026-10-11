import type { Metadata } from "next";
import Link from "next/link";
import { GLASS_BUTTON_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { getBookingRules, getSchedule, type ClassSlot } from "@/lib/api";
import { getMyBookedSlotIds, getMyRebookTimes, getMyWaitlistedSlotIds, getProfile } from "@/lib/account";
import { getCurrentUser } from "@/lib/auth";
import {
  addDays,
  balanceLabel,
  formatClassDateTime,
  formatStudioDay,
  groupByWeekAndDay,
  hoursLabel,
  studioDate,
} from "@/lib/format";
import { BookableScheduleList } from "@/components/BookableScheduleList";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { EmptyScheduleNotice } from "@/components/ScheduleList";
import { ScheduleDays } from "@/components/ScheduleDays";
import { getDirections } from "@/lib/directions";

// «Записаться» — как раздел Telegram-бота: ближайшие свободные занятия с
// фильтром по направлению и записью в один шаг.
export const metadata: Metadata = {
  title: "Записаться",
};

// Свободные места меняются в реальном времени — не кэшируем статически.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  class_key?: string;
  booked?: string;
  already?: string;
  book_error?: string;
  waitlist?: string;
  // Выбранная дата (YYYY-MM-DD) для поиска занятий.
  date?: string;
}>;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const {
    class_key: classKey,
    booked,
    already,
    book_error: bookError,
    waitlist,
    date: dateParam,
  } = await searchParams;
  const directions = await getDirections();
  const activeDirection = directions.find(
    (direction) => direction.key === classKey,
  );
  const [schedule, currentUser, rules] = await Promise.all([
    getSchedule(activeDirection?.key),
    getCurrentUser(),
    getBookingRules(),
  ]);
  const [profileResult, bookedSlotIds, waitlistedSlotIds, rebookTimes] = currentUser?.telegram_id
    ? await Promise.all([
        getProfile(),
        getMyBookedSlotIds(),
        getMyWaitlistedSlotIds(),
        getMyRebookTimes(),
      ])
    : [null, undefined, undefined, undefined];
  const profile = profileResult?.ok ? profileResult.data : null;
  const slots = schedule.ok ? schedule.data : [];
  // Как в BookableScheduleList: на сайте записи — только открытые занятия.
  const openSlots = slots.filter((slot) => slot.status === "open");
  const bookedSlot = booked
    ? slots.find((slot) => String(slot.id) === booked)
    : undefined;
  // Ближайшее — первое со свободными местами (иначе просто первое); оно
  // показано отдельной карточкой.
  const nearest = openSlots.find((slot) => slot.remaining > 0) ?? openSlots[0];
  // Ближайшие 7 дней (с сегодняшнего) — по датам; дальше — поиск по дате.
  const today = todayStudioDate();
  const weekEnd = addDays(today, 6);
  const allDays = groupByWeekAndDay(openSlots).flatMap((week) => week.days);
  const days = groupByWeekAndDay(
    openSlots.filter((slot) => slot !== nearest && studioDate(slot.starts_at) <= weekEnd),
  ).flatMap((week) => week.days);
  const lastDay = allDays.at(-1)?.day;
  const pickedDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;
  const pickedSlots = pickedDate
    ? openSlots.filter((slot) => studioDate(slot.starts_at) === pickedDate)
    : [];
  const renderList = (items: ClassSlot[], timeOnly: boolean) => (
    <BookableScheduleList
      slots={items}
      isAuthenticated={currentUser !== null}
      classKey={activeDirection?.key ?? null}
      cancellationDeadlineHours={rules.cancellation_deadline_hours}
      bookedSlotIds={bookedSlotIds}
      hasTelegram={currentUser?.telegram_id != null}
      waitlistedSlotIds={waitlistedSlotIds}
      rebookTimes={rebookTimes}
      timeOnly={timeOnly}
    />
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">Ближайшие занятия</h1>
        <p className="text-[var(--text-secondary)]">
          Выберите занятие, чтобы записаться
          {profile ? ` · ${balanceLabel(profile.lesson_credits)}` : ""}.
        </p>
      </div>

      {booked && (
        <BookedNotice
          slot={bookedSlot}
          already={already === "1"}
          credits={profile?.lesson_credits ?? null}
          cancellationDeadlineHours={rules.cancellation_deadline_hours}
        />
      )}
      {waitlist && (
        <p className="rounded-2xl bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]">
          {waitlist === "joined"
            ? "Вы в листе ожидания. Когда место освободится, придёт сообщение в Telegram — запишется тот, кто успеет первым."
            : "Вы вышли из листа ожидания."}
        </p>
      )}
      {bookError && (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
          <p>{bookError}</p>
          {/* Нет занятий на балансе — сразу путь к покупке, как в боте. */}
          {bookError.toLowerCase().includes("баланс") && (
            <Link href="/packages" className="mt-2 inline-block font-semibold underline">
              Выбрать абонемент
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <FilterLink label="Все направления" active={!activeDirection} />
        {directions.map((direction) => (
          <FilterLink
            key={direction.key}
            label={direction.label}
            classKey={direction.key}
            active={activeDirection?.key === direction.key}
          />
        ))}
      </div>

      {/* Расписание не загрузилось — не «свободных занятий нет». */}
      {schedule.ok ? (
        nearest === undefined ? (
          <EmptyScheduleNotice />
        ) : (
          <>
            <section className="flex flex-col gap-3" aria-labelledby="nearest-title">
              <h2 id="nearest-title" className="font-heading text-xl font-bold tracking-tight">
                Ближайшее занятие
              </h2>
              {renderList([nearest], false)}
            </section>

            {days.length > 0 && (
              <section className="flex flex-col gap-3" aria-labelledby="dates-title">
                <h2 id="dates-title" className="font-heading text-xl font-bold tracking-tight">
                  Ближайшие 7 дней
                </h2>
                <ScheduleDays
                  days={days}
                  renderDay={(items) => renderList(items, true)}
                  openDay={bookedSlot ? studioDate(bookedSlot.starts_at) : undefined}
                />
              </section>
            )}

            <section className="flex flex-col gap-3" aria-labelledby="pick-title">
              <h2 id="pick-title" className="font-heading text-xl font-bold tracking-tight">
                Другая дата
              </h2>
              <form
                action="/schedule"
                method="get"
                className="glass-medium flex flex-wrap items-end gap-3 rounded-[24px] p-4 sm:p-5"
              >
                {activeDirection && <input type="hidden" name="class_key" value={activeDirection.key} />}
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-[var(--text-secondary)]">
                  Выберите дату занятия
                  <input
                    type="date"
                    name="date"
                    required
                    min={today}
                    max={lastDay}
                    defaultValue={pickedDate}
                    className={`${INPUT_CLASS} text-base text-[var(--text-primary)]`}
                  />
                </label>
                <button type="submit" className={`${PRIMARY_BUTTON_CLASS} px-6 py-2.5 text-base`}>
                  Найти занятия
                </button>
              </form>
              {pickedDate && (
                <div className="flex flex-col gap-3" aria-live="polite">
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                    {formatStudioDay(pickedDate)}
                  </h3>
                  {pickedSlots.length > 0 ? (
                    renderList(pickedSlots, true)
                  ) : (
                    <p className="glass-subtle rounded-2xl px-4 py-3 text-sm text-[var(--text-secondary)]">
                      На эту дату занятий нет — попробуйте выбрать другую.
                    </p>
                  )}
                </div>
              )}
            </section>
          </>
        )
      ) : (
        <ServiceUnavailableNotice />
      )}
    </div>
  );
}

// Результат записи — те же сведения, что бот показывает после записи:
// направление, дата и время, баланс, срок отмены.
function BookedNotice({
  slot,
  already,
  credits,
  cancellationDeadlineHours,
}: {
  slot: ClassSlot | undefined;
  already: boolean;
  credits: number | null;
  cancellationDeadlineHours: number;
}) {
  const deadline = slot
    ? cancellationDeadline(slot.starts_at, cancellationDeadlineHours)
    : null;
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[color-mix(in_srgb,var(--success-text)_22%,transparent)] bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]">
      <p className="font-semibold">
        {already ? "Вы уже записаны на это занятие." : "Вы записаны ✓"}
      </p>
      {slot && (
        <p>
          {slot.class_label} · {formatClassDateTime(slot.starts_at)}
        </p>
      )}
      {!already && <p>Списано 1 занятие.{credits !== null ? ` ${balanceLabel(credits)}.` : ""}</p>}
      {deadline && (
        <p>
          {deadline.allowed
            ? `Отменить запись можно до ${formatClassDateTime(deadline.at)} — в «Мои занятия».`
            : `Отменить эту запись уже нельзя — до начала меньше ${hoursLabel(cancellationDeadlineHours)}.`}
        </p>
      )}
      <Link href="/account/bookings" className="mt-1 font-semibold underline">
        Мои занятия
      </Link>
    </div>
  );
}

// Отдельная функция: линтер считает текущее время в рендере нечистым.
function todayStudioDate(): string {
  return studioDate(new Date().toISOString());
}

function cancellationDeadline(startsAt: string, hours: number) {
  const at = new Date(new Date(startsAt).getTime() - hours * 60 * 60 * 1000);
  return { at: at.toISOString(), allowed: at.getTime() > Date.now() };
}

function FilterLink({
  label,
  classKey,
  active,
}: {
  label: string;
  classKey?: string;
  active: boolean;
}) {
  const href = classKey ? `/schedule?class_key=${classKey}` : "/schedule";
  return (
    <Link
      href={href}
      className={
        active
          ? "btn-primary rounded-full px-4 py-2 text-sm font-medium"
          : `${GLASS_BUTTON_CLASS} px-4 py-2 text-sm`
      }
    >
      {label}
    </Link>
  );
}
