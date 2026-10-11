import type { Metadata } from "next";
import Link from "next/link";
import { GLASS_BUTTON_CLASS } from "@/lib/glass";
import { getBookingRules, getSchedule, type ClassSlot } from "@/lib/api";
import { getMyBookedSlotIds, getMyWaitlistedSlotIds, getProfile } from "@/lib/account";
import { getCurrentUser } from "@/lib/auth";
import { balanceLabel, formatClassDateTime, groupByWeekAndDay, hoursLabel } from "@/lib/format";
import { BookableScheduleList } from "@/components/BookableScheduleList";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { EmptyScheduleNotice } from "@/components/ScheduleList";
import { ScheduleWeeks } from "@/components/ScheduleWeeks";
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
  const [profileResult, bookedSlotIds, waitlistedSlotIds] = currentUser?.telegram_id
    ? await Promise.all([getProfile(), getMyBookedSlotIds(), getMyWaitlistedSlotIds()])
    : [null, undefined, undefined];
  const profile = profileResult?.ok ? profileResult.data : null;
  const slots = schedule.ok ? schedule.data : [];
  // Как в BookableScheduleList: на сайте записи — только открытые занятия.
  const openSlots = slots.filter((slot) => slot.status === "open");
  const bookedSlot = booked
    ? slots.find((slot) => String(slot.id) === booked)
    : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-3">
        <span className="eyebrow">Ближайшие занятия</span>
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">Записаться</h1>
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
        openSlots.length === 0 ? (
          <EmptyScheduleNotice />
        ) : (
          <ScheduleWeeks
            weeks={groupByWeekAndDay(openSlots)}
            renderDay={(items) => (
              <BookableScheduleList
                slots={items}
                isAuthenticated={currentUser !== null}
                classKey={activeDirection?.key ?? null}
                cancellationDeadlineHours={rules.cancellation_deadline_hours}
                bookedSlotIds={bookedSlotIds}
                hasTelegram={currentUser?.telegram_id != null}
                waitlistedSlotIds={waitlistedSlotIds}
                timeOnly
              />
            )}
          />
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
