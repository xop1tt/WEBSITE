import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getMyBookings,
  getMyWaitlist,
  getProfile,
  type UserBooking,
  type WaitlistEntry,
} from "@/lib/account";
import { getBookingRules } from "@/lib/api";
import { cancelBookingAction, waitlistAction } from "@/lib/actions";
import { balanceLabel, formatClassDateTime, hoursLabel } from "@/lib/format";
import { GLASS_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";

export const metadata: Metadata = {
  title: "Мои занятия",
};

// Баланс и статус записи меняются в реальном времени — не кэшируем статически.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  cancelled?: string;
  cancel_error?: string;
  waitlist?: string;
  book_error?: string;
}>;

// Те же правила, что в «Мои занятия» Telegram-бота: предстоящие — от
// ближайшего, отмена — только пока она разрешена (срок приходит с backend),
// с подтверждением; баланс — рядом со списком.
export default async function AccountBookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const {
    cancelled,
    cancel_error: cancelError,
    waitlist: waitlistNotice,
    book_error: waitlistError,
  } = await searchParams;
  const [bookingsResult, profileResult, rules, waitlistResult] = await Promise.all([
    getMyBookings(),
    getProfile(),
    getBookingRules(),
    getMyWaitlist(),
  ]);
  const waitlist = waitlistResult.ok ? waitlistResult.data : [];
  if (!bookingsResult.ok && bookingsResult.error === "unauthorized") {
    redirect("/login");
  }
  const balance = profileResult.ok
    ? balanceLabel(profileResult.data.lesson_credits)
    : null;

  const notices = (
    <>
      {cancelled && (
        <p className="rounded-2xl border border-[color-mix(in_srgb,var(--success-text)_22%,transparent)] bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]">
          Запись отменена. Занятие вернулось на баланс
          {balance ? ` — ${balance}` : ""}.
        </p>
      )}
      {waitlistNotice === "left" && (
        <p className="rounded-2xl bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]">
          Вы вышли из листа ожидания.
        </p>
      )}
      {(cancelError || waitlistError) && (
        <p className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
          {cancelError ?? waitlistError}
        </p>
      )}
    </>
  );

  // Записи не загрузились — не показываем «Предстоящих занятий пока нет»:
  // это было бы неправдой.
  if (!bookingsResult.ok) {
    return (
      <div className="flex flex-col gap-8">
        {notices}
        <ServiceUnavailableNotice />
      </div>
    );
  }
  const { upcoming, history, now } = splitBookings(bookingsResult.data);

  return (
    <div className="flex flex-col gap-8">
      {notices}

      {waitlist.length > 0 && <WaitlistSection entries={waitlist} />}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-xl font-bold tracking-tight">Предстоящие</h2>
          {balance && (
            <span className="text-sm font-medium text-[var(--primary-text)]">{balance}</span>
          )}
        </div>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-[var(--text-secondary)]">
              Предстоящих занятий пока нет.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/schedule"
                className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm`}
              >
                Записаться
              </Link>
              <Link
                href="/packages"
                className={`${GLASS_BUTTON_CLASS} px-5 py-2 text-sm`}
              >
                Абонементы
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {upcoming.map((booking) => (
                <UpcomingBooking
                  key={booking.id}
                  booking={booking}
                  canCancel={new Date(booking.cancellable_until).getTime() > now}
                  rebookCooldownHours={rules.rebook_cooldown_hours}
                />
              ))}
            </ul>
            <p className="text-sm text-[var(--text-secondary)]">
              Отменить запись можно не позднее чем за{" "}
              {hoursLabel(rules.cancellation_deadline_hours)} до начала — занятие
              вернётся на баланс.
            </p>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-heading text-xl font-bold tracking-tight">История</h2>
        {history.length === 0 ? (
          <p className="text-[var(--text-secondary)]">Пока нет истории занятий.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {history.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-[24px] glass-medium p-4"
              >
                <span className="font-medium">{booking.class_label}</span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {formatClassDateTime(booking.starts_at)}
                  {booking.status_label
                    ? ` · ${booking.status_label.toLowerCase()}`
                    : booking.booking_status === "cancelled"
                      ? " · отменено"
                      : ""}
                </span>
                {booking.cancelled_by === "studio" && booking.slot_cancel_reason && (
                  <span className="basis-full text-xs text-[var(--text-secondary)]">
                    Причина: {booking.slot_cancel_reason}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Отдельная обычная функция, а не логика прямо в теле компонента: вызов
// Date.now() внутри функции компонента помечается линтером как нечистый.
// Предстоящие — подтверждённые будущие записи (как в боте); отменённые и
// прошедшие — в истории. Закрытие занятия для новых записей (slot_status
// "closed") существующую запись не отменяет.
function splitBookings(bookings: UserBooking[]) {
  const now = Date.now();
  const time = (booking: UserBooking) => new Date(booking.starts_at).getTime();
  const upcoming = bookings
    .filter((booking) => booking.booking_status === "confirmed" && time(booking) >= now)
    .sort((a, b) => time(a) - time(b));
  const history = bookings
    .filter((booking) => !upcoming.includes(booking))
    .sort((a, b) => time(b) - time(a));
  return { upcoming, history, now };
}

function UpcomingBooking({
  booking,
  canCancel,
  rebookCooldownHours,
}: {
  booking: UserBooking;
  canCancel: boolean;
  rebookCooldownHours: number;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] glass-medium p-4">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{booking.class_label}</span>
        <span className="text-sm text-[var(--text-secondary)]">
          {formatClassDateTime(booking.starts_at)}
        </span>
        {booking.previous_starts_at && (
          <span className="text-xs font-medium text-[var(--primary-text)]">
            Студия перенесла занятие — было {formatClassDateTime(booking.previous_starts_at)}
          </span>
        )}
        <span className="text-xs text-[var(--text-secondary)]">
          {canCancel
            ? `Отменить можно до ${formatClassDateTime(booking.cancellable_until)}`
            : "Отмена уже недоступна"}
        </span>
      </div>
      {canCancel && (
        <form action={cancelBookingAction}>
          <input type="hidden" name="slot_id" value={booking.slot_id} />
          <ConfirmSubmitButton
            confirmMessage={`Отменить запись на «${booking.class_label}», ${formatClassDateTime(booking.starts_at)}? Занятие вернётся на баланс. Записаться на это же занятие снова можно будет только через ${hoursLabel(rebookCooldownHours)}.`}
            className="text-sm font-medium text-[var(--danger)] hover:underline"
          >
            Отменить запись
          </ConfirmSubmitButton>
        </form>
      )}
    </li>
  );
}

function WaitlistSection({ entries }: { entries: WaitlistEntry[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-bold tracking-tight">Лист ожидания</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Когда освободится место, придёт сообщение в Telegram — запишется тот,
        кто успеет первым.
      </p>
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li
            key={entry.slot.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] glass-medium p-5"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium">{entry.slot.class_label}</span>
              <span className="text-sm text-[var(--text-secondary)]">
                {formatClassDateTime(entry.slot.starts_at)} · в очереди: {entry.queue_size}
              </span>
            </div>
            <form action={waitlistAction}>
              <input type="hidden" name="slot_id" value={entry.slot.id} />
              <input type="hidden" name="action" value="leave" />
              <input type="hidden" name="from" value="bookings" />
              <button type="submit" className={`${GLASS_BUTTON_CLASS} px-4 py-2 text-sm`}>
                Выйти из очереди
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
