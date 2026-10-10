import type { Metadata } from "next";
import { getAdminStaff, type StaffMember } from "@/lib/admin";
import { staffRemoveAction, staffRoleAction } from "@/lib/adminActions";
import { isServiceFailure } from "@/lib/apiResult";
import { GLASS_BUTTON_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { Badge, EmptyState, Notices } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Сотрудники",
};

type SearchParams = Promise<{ notice?: string; error?: string }>;

const ROLE_LABELS = { admin: "администратор", teacher: "преподаватель" } as const;

export default async function AdminStaffPage({ searchParams }: { searchParams: SearchParams }) {
  const { notice, error } = await searchParams;
  const staff = await getAdminStaff();
  if (!staff.ok) {
    return isServiceFailure(staff) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Notices notice={notice} error={error} />

      <section className="flex flex-col gap-3 rounded-[24px] glass-medium p-5">
        <h2 className="font-heading text-lg font-bold tracking-tight">Назначить сотрудника</h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Права выдаются по Telegram ID: человек должен хотя бы раз открыть бота
          (или войти на сайт через Telegram). На сайте права действуют для
          аккаунта, к которому привязан этот Telegram. Преподаватель видит
          только свои занятия и поддержку, без финансов и карточек участников.
        </p>
        <form action={staffRoleAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Telegram ID
            <input name="telegram_id" inputMode="numeric" required className={INPUT_CLASS} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Роль
            <select name="role" defaultValue="teacher" className={INPUT_CLASS}>
              <option value="teacher">Преподаватель</option>
              <option value="admin">Администратор</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium lg:col-span-2">
            Имя в расписании
            <input
              name="display_name"
              maxLength={64}
              placeholder="по умолчанию — имя из профиля"
              className={INPUT_CLASS}
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm`}>
              Назначить
            </button>
          </div>
        </form>
      </section>

      {staff.data.length === 0 ? (
        <EmptyState>Сотрудников пока нет.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {staff.data.map((member) => (
            <StaffRow key={member.telegram_id} member={member} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StaffRow({ member }: { member: StaffMember }) {
  const otherRole = member.role === "admin" ? "teacher" : "admin";
  return (
    <li className="flex flex-col gap-3 rounded-[24px] glass-medium p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-medium">{member.public_name}</span>
        <Badge tone="success">{ROLE_LABELS[member.role]}</Badge>
        {!member.has_web_account && <Badge>нет аккаунта на сайте</Badge>}
      </div>
      <div className="flex flex-wrap gap-x-4 text-sm text-[var(--text-secondary)]">
        <span>Telegram ID {member.telegram_id}</span>
        {member.public_name !== member.user_name && <span>профиль: {member.user_name}</span>}
        {member.phone && <span>{member.phone}</span>}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <form action={staffRoleAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="telegram_id" value={member.telegram_id} />
          <input type="hidden" name="role" value={member.role} />
          <label className="flex flex-col gap-1 text-xs font-medium">
            Имя в расписании
            <input
              name="display_name"
              maxLength={64}
              defaultValue={member.display_name ?? ""}
              placeholder={member.user_name}
              className={`${INPUT_CLASS} w-56 py-1.5`}
            />
          </label>
          <button type="submit" className={`${GLASS_BUTTON_CLASS} px-3 py-1.5 text-sm`}>
            Сохранить
          </button>
        </form>
        <form action={staffRoleAction}>
          <input type="hidden" name="telegram_id" value={member.telegram_id} />
          <input type="hidden" name="role" value={otherRole} />
          <input type="hidden" name="display_name" value={member.display_name ?? ""} />
          <button type="submit" className={`${GLASS_BUTTON_CLASS} px-3 py-1.5 text-sm`}>
            Сделать {otherRole === "admin" ? "администратором" : "преподавателем"}
          </button>
        </form>
        <form action={staffRemoveAction}>
          <input type="hidden" name="telegram_id" value={member.telegram_id} />
          <ConfirmSubmitButton
            confirmMessage={`Снять роль у «${member.public_name}»? Его занятия останутся без преподавателя.`}
            className="rounded-full bg-[var(--danger-bg)] px-3 py-1.5 text-sm font-medium text-[var(--danger-text)]"
          >
            Снять роль
          </ConfirmSubmitButton>
        </form>
      </div>
    </li>
  );
}
