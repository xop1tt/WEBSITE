import Link from "next/link";
import { isBookable, type ClassSlot } from "@/lib/api";
import { formatClassDateTime, hoursGenitive, hoursLabel, placesLabel } from "@/lib/format";
import { bookClassAction, waitlistAction } from "@/lib/actions";
import { ConfirmSubmitButton } from "./ConfirmSubmitButton";
import { EmptyScheduleNotice } from "./ScheduleList";

type Props = {
  slots: ClassSlot[];
  isAuthenticated: boolean;
  classKey: string | null;
  // Окно отмены из backend (GET /api/bookings/rules): запись ближе этого
  // срока необратима и, как в боте, требует подтверждения.
  cancellationDeadlineHours: number;
  // Занятия с подтверждённой записью текущего пользователя
  // (GET /api/bookings/me) — вместо кнопки показывается «Вы записаны».
  bookedSlotIds?: ReadonlySet<number>;
  // Запись требует привязанного Telegram (backend: 409 без него).
  hasTelegram?: boolean;
  // Занятия, в листе ожидания которых стоит пользователь.
  waitlistedSlotIds?: ReadonlySet<number>;
  // Список уже под заголовком дня — в карточке только время.
  timeOnly?: boolean;
  // После своей отмены: id занятия → когда снова можно записаться.
  rebookTimes?: ReadonlyMap<number, string>;
};

const NO_REBOOK: ReadonlyMap<number, string> = new Map();

const NO_BOOKINGS: ReadonlySet<number> = new Set();

// Те же правила, что в разделе «Записаться» Telegram-бота: открытые
// занятия; заполненные — с листом ожидания.
export function BookableScheduleList({
  slots,
  isAuthenticated,
  classKey,
  cancellationDeadlineHours,
  bookedSlotIds = NO_BOOKINGS,
  hasTelegram = false,
  waitlistedSlotIds = NO_BOOKINGS,
  timeOnly = false,
  rebookTimes = NO_REBOOK,
}: Props) {
  const bookable = slots.filter((slot) => slot.status === "open");
  if (bookable.length === 0) {
    return <EmptyScheduleNotice />;
  }

  const lateFrom = lateBookingThreshold(cancellationDeadlineHours);
  const now = lateBookingThreshold(0);
  return (
    <ul className="flex flex-col gap-3">
      {bookable.map((slot) => (
        <BookableScheduleCard
          key={slot.id}
          slot={slot}
          isAuthenticated={isAuthenticated}
          classKey={classKey}
          irreversible={new Date(slot.starts_at).getTime() < lateFrom}
          cancellationDeadlineHours={cancellationDeadlineHours}
          booked={bookedSlotIds.has(slot.id)}
          hasTelegram={hasTelegram}
          waitlisted={waitlistedSlotIds.has(slot.id)}
          timeOnly={timeOnly}
          rebookInHours={hoursUntil(rebookTimes.get(slot.id), now)}
        />
      ))}
    </ul>
  );
}

// Отдельная функция, а не Date.now() прямо в теле компонента: линтер
// считает вызов текущего времени в рендере нечистым.
function lateBookingThreshold(hours: number): number {
  return Date.now() + hours * 60 * 60 * 1000;
}

/** Сколько целых часов (с округлением вверх) осталось до момента; null — уже можно. */
function hoursUntil(iso: string | undefined, now: number): number | null {
  if (!iso) return null;
  const left = new Date(iso).getTime() - now;
  return left > 0 ? Math.ceil(left / (60 * 60 * 1000)) : null;
}

function BookableScheduleCard({
  slot,
  isAuthenticated,
  classKey,
  irreversible,
  cancellationDeadlineHours,
  booked,
  hasTelegram,
  waitlisted,
  timeOnly,
  rebookInHours,
}: {
  slot: ClassSlot;
  isAuthenticated: boolean;
  classKey: string | null;
  irreversible: boolean;
  cancellationDeadlineHours: number;
  booked: boolean;
  hasTelegram: boolean;
  waitlisted: boolean;
  timeOnly: boolean;
  // Пауза после своей отмены: сколько часов ждать; null — паузы нет.
  rebookInHours: number | null;
}) {
  const full = !isBookable(slot);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] glass-medium glass-specular p-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-medium">{slot.class_label}</span>
          <span className="text-sm text-[var(--text-secondary)]">
            {timeOnly
              ? formatClassDateTime(slot.starts_at).split(" · ").at(-1)
              : formatClassDateTime(slot.starts_at)}
          </span>
        </div>
        {slot.teacher_name && (
          <div className="text-sm text-[var(--text-secondary)]">
            Преподаватель: {slot.teacher_name}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--primary-text)]">
          <span
            className={`availability-dot ${full ? "availability-dot--full" : "availability-dot--free"}`}
            aria-hidden="true"
          />
          {full ? "Мест нет" : `Свободно ${placesLabel(slot.remaining)}`}
        </div>
        {irreversible && !booked && (
          <div className="text-xs text-[var(--text-secondary)]">
            До начала меньше {hoursGenitive(cancellationDeadlineHours)} — отменить
            запись будет нельзя.
          </div>
        )}
      </div>

      {booked ? (
        // Отмена — в «Мои занятия», с её правилами и подтверждением.
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-[var(--success-bg)] px-4 py-2 text-sm font-medium text-[var(--success-text)]">
            Вы записаны ✓
          </span>
          <Link
            href="/account/bookings"
            className="text-xs font-medium text-[var(--primary-text)] underline-offset-4 hover:underline"
          >
            Мои занятия
          </Link>
        </div>
      ) : full ? (
        isAuthenticated && hasTelegram ? (
          <form action={waitlistAction} className="flex shrink-0 flex-col items-end gap-1">
            <input type="hidden" name="slot_id" value={slot.id} />
            <input type="hidden" name="action" value={waitlisted ? "leave" : "join"} />
            {classKey && <input type="hidden" name="class_key" value={classKey} />}
            {waitlisted && (
              <span className="text-xs text-[var(--text-secondary)]">
                Вы в листе ожидания — напишем, когда освободится место
              </span>
            )}
            {rebookInHours !== null && (
              <span className="text-xs text-[var(--text-secondary)]">
                Записаться снова можно через {hoursLabel(rebookInHours)}
              </span>
            )}
            <button
              type="submit"
              className={`${waitlisted ? "glass-subtle" : "btn-primary"} rounded-full px-4 py-2 text-sm font-medium`}
            >
              {waitlisted ? "Выйти из очереди" : "🔔 В лист ожидания"}
            </button>
          </form>
        ) : (
          <span className="shrink-0 text-sm text-[var(--text-secondary)]">Мест нет</span>
        )
      ) : isAuthenticated && !hasTelegram ? (
        <Link
          href="/account"
          className="btn-primary shrink-0 rounded-full px-4 py-2 text-sm font-medium"
        >
          Привязать Telegram
        </Link>
      ) : isAuthenticated && rebookInHours !== null ? (
        // Та же пауза проверяется на backend; здесь — чтобы не нажимать
        // кнопку, которая всё равно откажет.
        <span
          title="Пауза после отмены записи — правило студии"
          className="shrink-0 rounded-full bg-[var(--surface-secondary)] px-4 py-2 text-sm text-[var(--text-secondary)]"
        >
          Можно через {hoursLabel(rebookInHours)}
        </span>
      ) : isAuthenticated ? (
        <form action={bookClassAction}>
          <input type="hidden" name="slot_id" value={slot.id} />
          {classKey && <input type="hidden" name="class_key" value={classKey} />}
          {irreversible ? (
            <ConfirmSubmitButton
              confirmMessage={`Записаться на занятие? До начала меньше ${hoursGenitive(cancellationDeadlineHours)} — отменить эту запись будет нельзя, занятие спишется с баланса.`}
              className="btn-primary shrink-0 rounded-full px-4 py-2 text-sm font-medium"
            >
              Записаться
            </ConfirmSubmitButton>
          ) : (
            <button
              type="submit"
              className="btn-primary shrink-0 rounded-full px-4 py-2 text-sm font-medium"
            >
              Записаться
            </button>
          )}
        </form>
      ) : (
        <Link
          href="/login?next=/schedule"
          className="btn-primary shrink-0 rounded-full px-4 py-2 text-sm font-medium"
        >
          Войти и записаться
        </Link>
      )}
    </li>
  );
}
