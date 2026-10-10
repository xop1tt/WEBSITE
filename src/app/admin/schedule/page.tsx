import type { Metadata } from "next";
import Link from "next/link";
import {
  getAdminParticipants,
  getAdminSlotWaitlist,
  getAdminSlots,
  getAdminStaff,
  type AdminParticipant,
  type AdminSlot,
  type StaffMember,
} from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { copyWeekAction, createSlotAction, slotAction } from "@/lib/adminActions";
import { getClasses } from "@/lib/api";
import { isServiceFailure } from "@/lib/apiResult";
import { STUDIO_TIMEZONE, formatClassDateTime } from "@/lib/format";
import { GLASS_BUTTON_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { Badge, EmptyState, Notices, formatAdminDateTime } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Расписание",
};

type SearchParams = Promise<{
  notice?: string;
  error?: string;
  slot?: string;
  from?: string;
  to?: string;
}>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Начало дня в часовом поясе студии (для периода архива). */
function dayStart(date: string): string {
  return `${date}T00:00:00${studioOffsetLabel(date)}`;
}

function studioOffsetLabel(date: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIMEZONE,
    timeZoneName: "longOffset",
  }).formatToParts(new Date(`${date}T12:00:00Z`));
  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  return name.replace("GMT", "") || "+00:00";
}

const STATUS = {
  open: { label: "запись открыта", tone: "success" },
  closed: { label: "запись закрыта", tone: "neutral" },
  cancelled: { label: "отменено", tone: "danger" },
} as const;

export default async function AdminSchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const { notice, error, slot: openSlot, from, to } = await searchParams;
  // Архив: период дат (по времени студии), «по» — включительно.
  const archive =
    from && to && DATE_RE.test(from) && DATE_RE.test(to) && from <= to
      ? {
          from: dayStart(from),
          to: dayStart(
            new Date(Date.parse(`${to}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10),
          ),
        }
      : undefined;
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const [slots, classes, staff] = await Promise.all([
    getAdminSlots(archive),
    getClasses(),
    // Список сотрудников нужен только администратору (выбор преподавателя).
    isAdmin ? getAdminStaff() : Promise.resolve(null),
  ]);
  if (!slots.ok) {
    return isServiceFailure(slots) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  const teachers = staff?.ok ? staff.data : [];
  const selectedId = Number(openSlot);
  const [participants, waitlist] =
    Number.isInteger(selectedId) && selectedId > 0
      ? await Promise.all([getAdminParticipants(selectedId), getAdminSlotWaitlist(selectedId)])
      : [null, null];
  const classOptions = classes.ok ? classes.data : [];

  return (
    <div className="flex flex-col gap-6">
      <Notices notice={notice} error={error} />

      <form className="flex flex-wrap items-end gap-2 text-sm">
        <span className="font-medium">Архив занятий:</span>
        <label className="flex flex-col gap-1 text-xs font-medium">
          с
          <input type="date" name="from" defaultValue={from} className={`${INPUT_CLASS} py-1.5`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          по
          <input type="date" name="to" defaultValue={to} className={`${INPUT_CLASS} py-1.5`} />
        </label>
        <button type="submit" className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm`}>
          Показать
        </button>
        {archive && (
          <Link href="/admin/schedule" className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm`}>
            К ближайшим
          </Link>
        )}
      </form>

      {isAdmin && !archive && (
        <details className="rounded-[24px] glass-medium p-5" open={slots.data.length === 0}>
          <summary className="cursor-pointer font-heading text-lg font-bold tracking-tight">
            + Новое занятие
          </summary>
          <form action={createSlotAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col gap-1.5 text-sm font-medium lg:col-span-2">
              Направление
              <select name="class_key" required className={INPUT_CLASS}>
                {classOptions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Дата
              <input type="date" name="date" required className={INPUT_CLASS} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Время (студии)
              <input type="time" name="time" required className={INPUT_CLASS} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Мест
              <input
                type="number"
                name="capacity"
                min={1}
                max={100}
                defaultValue={10}
                required
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2 lg:col-span-3">
              Преподаватель
              <TeacherSelect teachers={teachers} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium lg:col-span-2">
              Повторять еженедельно, всего занятий
              <input type="number" name="weeks" min={1} max={12} defaultValue={1} className={INPUT_CLASS} />
            </label>
            <div className="sm:col-span-2 lg:col-span-5">
              <button type="submit" className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm`}>
                Создать занятие
              </button>
            </div>
          </form>
        </details>
      )}

      {isAdmin && !archive && (
        <form action={copyWeekAction} className="flex flex-wrap items-end gap-2 rounded-[24px] glass-subtle p-4 text-sm">
          <span className="font-medium">Скопировать неделю:</span>
          <label className="flex flex-col gap-1 text-xs font-medium">
            любой день недели-образца
            <input type="date" name="week_start" required className={`${INPUT_CLASS} py-1.5`} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            на недель вперёд
            <input type="number" name="weeks" min={1} max={12} defaultValue={1} className={`${INPUT_CLASS} w-24 py-1.5`} />
          </label>
          <ConfirmSubmitButton
            confirmMessage="Скопировать занятия этой недели (с преподавателями и вместимостью)? Уже существующие и прошедшие занятия пропускаются."
            className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm`}
          >
            Скопировать
          </ConfirmSubmitButton>
        </form>
      )}

      {slots.data.length === 0 ? (
        <EmptyState>
          {archive
            ? "За этот период занятий нет."
            : isAdmin
              ? "Предстоящих занятий нет."
              : "Вам пока не назначены занятия."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {slots.data.map((slot) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              expanded={slot.id === selectedId}
              participants={slot.id === selectedId && participants?.ok ? participants.data : null}
              waitlist={slot.id === selectedId && waitlist?.ok ? waitlist.data : []}
              teachers={isAdmin ? teachers : null}
              archived={archive !== undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TeacherSelect({
  teachers,
  defaultValue,
  className = INPUT_CLASS,
}: {
  teachers: StaffMember[];
  defaultValue?: number | null;
  className?: string;
}) {
  return (
    <select
      name="teacher_telegram_id"
      defaultValue={defaultValue ? String(defaultValue) : ""}
      className={className}
    >
      <option value="">Без преподавателя</option>
      {teachers.map((member) => (
        <option key={member.telegram_id} value={member.telegram_id}>
          {member.public_name}
          {member.role === "admin" ? " (администратор)" : ""}
        </option>
      ))}
    </select>
  );
}

function SlotRow({
  slot,
  expanded,
  participants,
  teachers,
  archived,
  waitlist,
}: {
  slot: AdminSlot;
  expanded: boolean;
  participants: AdminParticipant[] | null;
  // null — смотрит преподаватель: менять преподавателя нельзя.
  teachers: StaffMember[] | null;
  // Архив: прошедшие занятия не переносятся (уже начавшееся не перенесёт
  // и backend).
  archived: boolean;
  waitlist: { telegram_id: number; user_name: string; phone: string | null }[];
}) {
  const status = STATUS[slot.status];
  const fill = slot.capacity > 0 ? Math.round((100 * slot.booked) / slot.capacity) : 0;
  const editable = slot.status !== "cancelled";

  return (
    <li className="flex flex-col gap-3 rounded-[24px] glass-medium p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-medium">{slot.class_label}</span>
            <span className="text-sm text-[var(--text-secondary)]">
              {formatClassDateTime(slot.starts_at)}
            </span>
            <Badge tone={status.tone}>{status.label}</Badge>
            {slot.rescheduled && <Badge>перенесено</Badge>}
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span>
              Записано {slot.booked} из {slot.capacity}
            </span>
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--border)]">
              <span
                className="block h-full rounded-full bg-[var(--primary)]"
                style={{ width: `${Math.min(fill, 100)}%` }}
              />
            </span>
          </div>
          {slot.teacher_name && (
            <span className="text-sm text-[var(--text-secondary)]">
              Преподаватель: {slot.teacher_name}
            </span>
          )}
          {slot.cancel_reason && (
            <span className="text-xs text-[var(--text-secondary)]">Причина: {slot.cancel_reason}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={expanded ? "/admin/schedule" : `/admin/schedule?slot=${slot.id}`}
            scroll={false}
            className={`${GLASS_BUTTON_CLASS} px-3 py-1.5 text-sm`}
          >
            {expanded ? "Скрыть" : "Участники"}
          </Link>
          {slot.status === "open" && (
            <SlotButton slotId={slot.id} action="close" label="Закрыть запись" />
          )}
          {slot.status === "closed" && (
            <SlotButton slotId={slot.id} action="reopen" label="Открыть запись" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-4">
          {participants === null ? (
            <p className="text-sm text-[var(--text-secondary)]">Не удалось загрузить участников.</p>
          ) : participants.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Пока никто не записан.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {participants.map((participant) => (
                <li key={participant.booking_id} className="flex flex-wrap gap-x-3">
                  <span className="font-medium">{participant.user_name}</span>
                  <span className="text-[var(--text-secondary)]">{participant.phone ?? "без телефона"}</span>
                  <span className="text-[var(--text-secondary)]">
                    записан {formatAdminDateTime(participant.booked_at)}
                  </span>
                  {participant.status !== "confirmed" && <Badge>{participant.status}</Badge>}
                </li>
              ))}
            </ul>
          )}

          {waitlist.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Лист ожидания ({waitlist.length}):</span>{" "}
              <span className="text-[var(--text-secondary)]">
                {waitlist.map((member) => member.user_name).join(", ")}
              </span>
            </div>
          )}

          {editable && !archived && (
            <form action={slotAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="slot_id" value={slot.id} />
              <input type="hidden" name="action" value="reschedule" />
              <label className="flex flex-col gap-1 text-xs font-medium">
                Перенести на дату
                <input type="date" name="date" required className={`${INPUT_CLASS} py-1.5`} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                время (студии)
                <input type="time" name="time" required className={`${INPUT_CLASS} py-1.5`} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                Причина
                <input name="reason" maxLength={300} placeholder="необязательно" className={`${INPUT_CLASS} w-48 py-1.5`} />
              </label>
              <ConfirmSubmitButton
                confirmMessage={`Перенести занятие? Записи и баланс сохранятся, записанные (${slot.booked}) получат уведомление и смогут отменить запись до нового начала.`}
                className={`${GLASS_BUTTON_CLASS} px-3 py-1.5 text-sm`}
              >
                Перенести
              </ConfirmSubmitButton>
            </form>
          )}

          {editable && (
            <div className="flex flex-wrap items-end gap-4">
              <form action={slotAction} className="flex items-end gap-2">
                <input type="hidden" name="slot_id" value={slot.id} />
                <input type="hidden" name="action" value="capacity" />
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Мест
                  <input
                    type="number"
                    name="capacity"
                    min={Math.max(1, slot.booked)}
                    max={100}
                    defaultValue={slot.capacity}
                    className={`${INPUT_CLASS} w-24 py-1.5`}
                  />
                </label>
                <button type="submit" className={`${GLASS_BUTTON_CLASS} px-3 py-1.5 text-sm`}>
                  Сохранить
                </button>
              </form>
              {teachers && (
                <form action={slotAction} className="flex items-end gap-2">
                  <input type="hidden" name="slot_id" value={slot.id} />
                  <input type="hidden" name="action" value="teacher" />
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    Преподаватель
                    <TeacherSelect
                      teachers={teachers}
                      defaultValue={slot.teacher_telegram_id}
                      className={`${INPUT_CLASS} w-56 py-1.5`}
                    />
                  </label>
                  <button type="submit" className={`${GLASS_BUTTON_CLASS} px-3 py-1.5 text-sm`}>
                    Назначить
                  </button>
                </form>
              )}
              <form action={slotAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="slot_id" value={slot.id} />
                <input type="hidden" name="action" value="cancel" />
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Причина отмены
                  <input
                    name="reason"
                    maxLength={300}
                    placeholder="необязательно"
                    className={`${INPUT_CLASS} w-56 py-1.5`}
                  />
                </label>
                <ConfirmSubmitButton
                  confirmMessage={`Отменить занятие? Записанным (${slot.booked}) вернутся занятия и придут уведомления. Отмену нельзя откатить.`}
                  className="rounded-full bg-[var(--danger-bg)] px-3 py-1.5 text-sm font-medium text-[var(--danger-text)]"
                >
                  Отменить занятие
                </ConfirmSubmitButton>
              </form>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function SlotButton({ slotId, action, label }: { slotId: number; action: string; label: string }) {
  return (
    <form action={slotAction}>
      <input type="hidden" name="slot_id" value={slotId} />
      <input type="hidden" name="action" value={action} />
      <button type="submit" className={`${GLASS_BUTTON_CLASS} px-3 py-1.5 text-sm`}>
        {label}
      </button>
    </form>
  );
}
