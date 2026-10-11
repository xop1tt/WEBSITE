import type { Metadata } from "next";
import Link from "next/link";
import { getAdminAudit, getAdminLedger, getAdminReconciliation } from "@/lib/admin";
import { isServiceFailure } from "@/lib/apiResult";
import { GLASS_BUTTON_CLASS } from "@/lib/glass";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { EmptyState, SubTabs, formatAdminDateTime } from "@/components/admin/AdminUi";
import {
  ParticipantField,
  ParticipantMatches,
  filterTelegramId,
  resolveParticipantFilter,
} from "@/components/admin/ParticipantFilter";

export const metadata: Metadata = {
  title: "Финансы",
};

type SearchParams = Promise<{
  tab?: string;
  telegram_id?: string;
  who?: string;
  before?: string;
}>;

const TABS = [
  ["ledger", "Операции с балансом"],
  ["audit", "Журнал действий"],
  ["reconciliation", "Сверка баланса"],
] as const;

const SECTION = "flex flex-col gap-3 rounded-[24px] glass-medium p-5";
const LINK = "text-[var(--primary-text)] underline-offset-4 hover:underline";

export default async function AdminFinancePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tab = TABS.some(([key]) => key === params.tab) ? params.tab : "ledger";

  return (
    <div className="flex flex-col gap-4">
      <SubTabs
        tabs={TABS.map(([key, label]) => ({
          href: `/admin/finance?tab=${key}`,
          label,
          active: tab === key,
        }))}
      />
      {tab === "ledger" && <Ledger params={params} />}
      {tab === "audit" && <Audit before={params.before} />}
      {tab === "reconciliation" && <Reconciliation />}
    </div>
  );
}

async function Ledger({ params }: { params: { telegram_id?: string; who?: string; before?: string } }) {
  const participant = await resolveParticipantFilter(params);
  const before = Number(params.before);
  const validId = filterTelegramId(participant);
  const filterUnresolved = participant.kind === "choose" || participant.kind === "notFound";
  const result = await getAdminLedger({
    telegram_id: validId,
    before_id: Number.isInteger(before) && before > 0 ? before : undefined,
  });
  if (!result.ok) {
    return isServiceFailure(result) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  return (
    <section className={SECTION}>
      <form className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value="ledger" />
        <ParticipantField who={params.who ?? params.telegram_id} />
        <button type="submit" className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm`}>
          Показать
        </button>
      </form>
      <ParticipantMatches
        filter={participant}
        hrefFor={(user) =>
          `/admin/finance?${new URLSearchParams({
            tab: "ledger",
            who: user.name,
            telegram_id: String(user.telegram_id),
          }).toString()}`
        }
      />
      {filterUnresolved ? null : result.data.items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">Операций нет.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {result.data.items.map((item) => (
            <li key={item.id} className="flex flex-wrap gap-x-3">
              <span className="text-[var(--text-secondary)]">{formatAdminDateTime(item.created_at)}</span>
              <Link href={`/admin/users/${item.telegram_id}`} className={LINK}>
                {item.user_name ?? item.telegram_id}
              </Link>
              <span className={item.delta > 0 ? "text-[var(--success-text)]" : ""}>
                {item.delta > 0 ? `+${item.delta}` : item.delta}
              </span>
              <span>{item.label}</span>
              {item.package_title && <span className="text-[var(--text-secondary)]">«{item.package_title}»</span>}
              {item.reason && <span className="text-[var(--text-secondary)]">— {item.reason}</span>}
              {item.actor_telegram_id !== null && item.actor_telegram_id !== 0 && (
                <span className="text-xs text-[var(--text-secondary)]">админ {item.actor_telegram_id}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {!filterUnresolved && result.data.next_before_id && (
        <Link
          href={`/admin/finance?${new URLSearchParams({
            tab: "ledger",
            ...(validId ? { telegram_id: String(validId) } : {}),
            before: String(result.data.next_before_id),
          }).toString()}`}
          className={`${GLASS_BUTTON_CLASS} self-start px-4 py-1.5 text-sm`}
        >
          Старше →
        </Link>
      )}
    </section>
  );
}

async function Audit({ before }: { before?: string }) {
  const result = await getAdminAudit(before);
  if (!result.ok) {
    return isServiceFailure(result) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  return (
    <section className={SECTION}>
      <p className="text-sm text-[var(--text-secondary)]">
        Действия сотрудников: баланс и абонементы, расписание, возвраты оплаты,
        профили участников, каталог, настройки, роли.
      </p>
      {result.data.items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">Записей нет.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {result.data.items.map((event, index) => (
            <li key={`${event.created_at}-${index}`} className="flex flex-wrap gap-x-3">
              <span className="text-[var(--text-secondary)]">{formatAdminDateTime(event.created_at)}</span>
              <span className="font-medium">
                {event.actor_name ?? (event.actor_telegram_id ? `ID ${event.actor_telegram_id}` : "система")}
              </span>
              <span>{event.label}</span>
              {event.target_telegram_id && (
                <Link href={`/admin/users/${event.target_telegram_id}`} className={LINK}>
                  {event.target_name ?? event.target_telegram_id}
                </Link>
              )}
              {event.slot_id && <span className="text-[var(--text-secondary)]">занятие №{event.slot_id}</span>}
              {event.payment_id && <span className="text-[var(--text-secondary)]">платёж №{event.payment_id}</span>}
              {event.delta !== null && (
                <span>{event.delta > 0 ? `+${event.delta}` : event.delta}</span>
              )}
              {event.reason && <span className="text-[var(--text-secondary)]">— {event.reason}</span>}
            </li>
          ))}
        </ul>
      )}
      {result.data.next_before && (
        <Link
          href={`/admin/finance?${new URLSearchParams({ tab: "audit", before: result.data.next_before }).toString()}`}
          className={`${GLASS_BUTTON_CLASS} self-start px-4 py-1.5 text-sm`}
        >
          Старше →
        </Link>
      )}
    </section>
  );
}

async function Reconciliation() {
  const result = await getAdminReconciliation();
  if (!result.ok) {
    return isServiceFailure(result) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  const data = result.data;
  return (
    <section className={SECTION}>
      <p className="text-sm">
        Проверено участников: {data.checked_users}. Расхождений: {data.mismatched_users}.
      </p>
      <p className="text-xs text-[var(--text-secondary)]">
        Баланс сравнивается с суммой журнала операций. Сверка ничего не
        исправляет — расхождение разберите вручную (корректировкой с причиной).
      </p>
      {data.mismatches.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {data.mismatches.map((item) => (
            <li key={item.telegram_id} className="flex flex-wrap gap-x-3">
              <Link href={`/admin/users/${item.telegram_id}`} className={LINK}>
                {item.user_name}
              </Link>
              <span>баланс {item.lesson_credits}</span>
              <span>по журналу {item.ledger_total}</span>
              <span className="font-medium text-[var(--danger-text)]">
                разница {item.difference > 0 ? `+${item.difference}` : item.difference}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
