import type { Metadata } from "next";
import Link from "next/link";
import {
  getAdminParticipants,
  getAdminSlots,
  getAdminStaff,
  type AdminParticipant,
  type AdminSlot,
  type StaffMember,
} from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { createSlotAction, slotAction } from "@/lib/adminActions";
import { getClasses } from "@/lib/api";
import { isServiceFailure } from "@/lib/apiResult";
import { formatClassDateTime } from "@/lib/format";
import { GLASS_BUTTON_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { Badge, EmptyState, Notices, formatAdminDateTime } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Расписание",
};

type SearchParams = Promise<{ notice?: string; error?: string; slot?: string }>;

const STATUS = {
  open: { label: "запись открыта", tone: "success" },
  closed: { label: "запись закрыта", tone: "neutral" },
  cancelled: { label: "отменено", tone: "danger" },
} as const;

export default async function AdminSchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const { notice, error, slot: openSlot } = await searchParams;
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const [slots, classes, staff] = await Promise.all([
    getAdminSlots(),
    getClasses(),
    // Список сотрудников нужен только администратору (выбор преподавателя).
    isAdmin ? getAdminStaff() : Promise.resolve(null),
  ]);
  if (!slots.ok) {
    return isServiceFailure(slots) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  const teachers = staff?.ok ? staff.data : [];
  const selectedId = Number(openSlot);
  const participants =
    Number.isInteger(selectedId) && selectedId > 0
      ? await getAdminParticipants(selectedId)
      : null;
  const classOptions = classes.ok ? classes.data : [];

  return (
    <div className="flex flex-col gap-6">
      <Notices notice={notice} error={error} />

      {isAdmin && (
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
            <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2 lg:col-span-5">
              Преподаватель
              <TeacherSelect teachers={teachers} />
            </label>
            <div className="sm:col-span-2 lg:col-span-5">
              <button type="submit" className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm`}>
                Создать занятие
              </button>
            </div>
          </form>
        </details>
      )}

      {slots.data.length === 0 ? (
        <EmptyState>
          {isAdmin ? "Предстоящих занятий нет." : "Вам пока не назначены занятия."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {slots.data.map((slot) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              expanded={slot.id === selectedId}
              participants={slot.id === selectedId && participants?.ok ? participants.data : null}
              teachers={isAdmin ? teachers : null}
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
}: {
  slot: AdminSlot;
  expanded: boolean;
  participants: AdminParticipant[] | null;
  // null — смотрит преподаватель: менять преподавателя нельзя.
  teachers: StaffMember[] | null;
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
