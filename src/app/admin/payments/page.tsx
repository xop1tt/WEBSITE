import type { Metadata } from "next";
import Link from "next/link";
import { getAdminPayments } from "@/lib/admin";
import { isServiceFailure } from "@/lib/apiResult";
import { GLASS_BUTTON_CLASS, INPUT_CLASS } from "@/lib/glass";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { PaymentActions } from "@/components/admin/PaymentActions";
import {
  ParticipantField,
  ParticipantMatches,
  filterTelegramId,
  resolveParticipantFilter,
} from "@/components/admin/ParticipantFilter";
import {
  Badge,
  EmptyState,
  Notices,
  formatAdminDateTime,
  formatRub,
} from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Платежи",
};

const TONES: Record<string, "success" | "danger" | "neutral"> = {
  succeeded: "success",
  canceled: "danger",
  refunded: "danger",
};

const STATUS_FILTERS = [
  ["", "Все"],
  ["succeeded", "Оплачены"],
  ["pending", "Ожидают оплаты"],
  ["refund_pending", "Возврат в обработке"],
  ["refunded", "Возвращены"],
  ["canceled", "Отменены"],
] as const;

type SearchParams = Promise<{
  status?: string;
  before?: string;
  telegram_id?: string;
  who?: string;
  notice?: string;
  error?: string;
}>;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = STATUS_FILTERS.some(([value]) => value === params.status) ? params.status : "";
  const before = Number(params.before);
  const participant = await resolveParticipantFilter(params);
  const telegramId = filterTelegramId(participant);
  // Несколько совпадений или никого — платежи всех показывать нельзя:
  // админ решил бы, что это платежи искомого человека.
  const filterUnresolved = participant.kind === "choose" || participant.kind === "notFound";
  const result = await getAdminPayments({
    status: status || undefined,
    before_id: Number.isInteger(before) && before > 0 ? before : undefined,
    telegram_id: telegramId,
  });
  if (!result.ok) {
    return isServiceFailure(result) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  const page = result.data;
  const returnTo = `/admin/payments${status ? `?status=${status}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <Notices notice={params.notice} error={params.error} />
      <form className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Статус
          <select name="status" defaultValue={status} className={`${INPUT_CLASS} py-1.5`}>
            {STATUS_FILTERS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <ParticipantField who={params.who ?? params.telegram_id} />
        <button type="submit" className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm`}>
          Показать
        </button>
      </form>

      <ParticipantMatches
        filter={participant}
        hrefFor={(user) =>
          `/admin/payments?${new URLSearchParams({
            ...(status ? { status } : {}),
            who: user.name,
            telegram_id: String(user.telegram_id),
          }).toString()}`
        }
      />

      {filterUnresolved ? null : page.items.length === 0 ? (
        <EmptyState>Платежей не найдено.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-[24px] glass-medium">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 font-medium">№</th>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Участник</th>
                <th className="px-4 py-3 font-medium">Абонемент</th>
                <th className="px-4 py-3 font-medium">Сумма</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((payment) => (
                <tr key={payment.id} className="border-b border-[var(--border)] align-top last:border-0">
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{payment.id}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {formatAdminDateTime(payment.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${payment.telegram_id}`}
                      className="font-medium text-[var(--primary-text)] underline-offset-4 hover:underline"
                    >
                      {payment.user_name ?? payment.telegram_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {payment.package_title}
                    {payment.expires_at && payment.status === "succeeded" && (
                      <span className="block text-xs text-[var(--text-secondary)]">
                        до {formatAdminDateTime(payment.expires_at)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatRub(payment.amount_rub)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TONES[payment.status] ?? "neutral"}>{payment.status_label}</Badge>
                    {payment.refund_reason && (
                      <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                        {payment.refund_reason}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentActions payment={payment} returnTo={returnTo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!filterUnresolved && page.next_before_id && (
        <Link
          href={`/admin/payments?${new URLSearchParams({
            ...(status ? { status } : {}),
            ...(telegramId ? { telegram_id: String(telegramId) } : {}),
            before: String(page.next_before_id),
          }).toString()}`}
          className={`${GLASS_BUTTON_CLASS} self-start px-4 py-2 text-sm`}
        >
          Старше →
        </Link>
      )}
    </div>
  );
}
