import type { Metadata } from "next";
import Link from "next/link";
import { getFailedNotifications } from "@/lib/admin";
import { isServiceFailure } from "@/lib/apiResult";
import { GLASS_BUTTON_CLASS } from "@/lib/glass";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { Badge, EmptyState, StatCard, formatAdminDateTime } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Уведомления",
};

type SearchParams = Promise<{ before?: string }>;

const KIND_LABELS: Record<string, string> = {
  booking_confirmed: "запись",
  booking_cancelled: "отмена записи",
  slot_cancelled: "отмена занятия",
  slot_rescheduled: "перенос",
  lesson_reminder: "напоминание",
  low_balance: "мало занятий",
  package_granted: "выдача абонемента",
  package_revoked: "отзыв абонемента",
  credits_adjusted: "корректировка",
  package_expiring: "скоро сгорит",
  credits_expired: "сгорание",
  waitlist_seat: "место из очереди",
  announcement: "рассылка",
};

export default async function AdminNotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const { before } = await searchParams;
  const beforeId = Number(before);
  const result = await getFailedNotifications(
    Number.isInteger(beforeId) && beforeId > 0 ? beforeId : undefined,
  );
  if (!result.ok) {
    return isServiceFailure(result) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  const { stats, items, next_before_id: next } = result.data;

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Доставлено за 30 дней" value={stats.sent ?? 0} />
        <StatCard label="Не доставлено" value={stats.failed ?? 0} accent={(stats.failed ?? 0) > 0} />
        <StatCard label="Пропущено (устарели)" value={stats.skipped ?? 0} />
        <StatCard label="Недоступны в Telegram" value={stats.unreachable_users ?? 0} hint="заблокировали бота и т. п." />
      </section>
      <p className="text-sm text-[var(--text-secondary)]">
        «Не доставлено» — Telegram отказал (чаще всего участник заблокировал
        бота): такие сообщения он увидит только на сайте. «Пропущено» —
        уведомление устарело до отправки (например, напоминание после начала).
      </p>
      {items.length === 0 ? (
        <EmptyState>Сбоев нет.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 rounded-2xl glass-subtle px-4 py-2">
              <span className="text-[var(--text-secondary)]">{formatAdminDateTime(item.created_at)}</span>
              <Link href={`/admin/users/${item.telegram_id}`} className="text-[var(--primary-text)] underline-offset-4 hover:underline">
                {item.user_name ?? item.telegram_id}
              </Link>
              <span>{KIND_LABELS[item.kind] ?? item.kind}</span>
              <Badge tone={item.delivery_status === "failed" ? "danger" : "neutral"}>
                {item.delivery_status === "failed" ? "не доставлено" : "пропущено"}
              </Badge>
              {item.last_error && <span className="text-xs text-[var(--text-secondary)]">{item.last_error}</span>}
            </li>
          ))}
        </ul>
      )}
      {next && (
        <Link href={`/admin/notifications?before=${next}`} className={`${GLASS_BUTTON_CLASS} self-start px-4 py-1.5 text-sm`}>
          Старше →
        </Link>
      )}
    </div>
  );
}
