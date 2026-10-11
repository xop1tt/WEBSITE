import type { Metadata } from "next";
import Link from "next/link";
import { getAdminReport, type AdminReport } from "@/lib/admin";
import { isServiceFailure } from "@/lib/apiResult";
import { STUDIO_TIMEZONE, lessonsCount, formatPhone } from "@/lib/format";
import { GLASS_BUTTON_CLASS, INPUT_CLASS } from "@/lib/glass";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { EmptyState, StatCard, formatAdminDateTime, formatRub } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Отчёты",
};

type SearchParams = Promise<{ from?: string; to?: string; sleeping?: string }>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const SECTION = "flex flex-col gap-3 rounded-[24px] glass-medium p-5";
const H2 = "font-heading text-lg font-bold tracking-tight";

/** Полночь даты по часам студии в ISO с поясом. */
function studioMidnight(date: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIMEZONE,
    timeZoneName: "longOffset",
  }).formatToParts(new Date(`${date}T12:00:00Z`));
  const offset = (parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT").replace("GMT", "");
  return `${date}T00:00:00${offset || "+00:00"}`;
}

function nextDay(date: string): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

function percent(booked: number, capacity: number): string {
  return capacity > 0 ? `${Math.round((100 * booked) / capacity)}%` : "—";
}

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const { from, to, sleeping } = await searchParams;
  const period =
    from && to && DATE_RE.test(from) && DATE_RE.test(to) && from <= to
      ? { from: studioMidnight(from), to: studioMidnight(nextDay(to)) }
      : {};
  const sleepingDays = Math.min(365, Math.max(1, Number(sleeping) || 30));
  const result = await getAdminReport({ ...period, sleeping_days: sleepingDays });
  if (!result.ok) {
    return isServiceFailure(result) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  const report = result.data;
  const exportQuery = new URLSearchParams({ from: report.from, to: report.to }).toString();

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col gap-1 text-xs font-medium">
          с
          <input type="date" name="from" defaultValue={from} className={`${INPUT_CLASS} py-1.5`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          по
          <input type="date" name="to" defaultValue={to} className={`${INPUT_CLASS} py-1.5`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          «Спящие»: без записи, дней
          <input type="number" name="sleeping" min={1} max={365} defaultValue={sleepingDays} className={`${INPUT_CLASS} w-28 py-1.5`} />
        </label>
        <button type="submit" className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm`}>
          Показать
        </button>
        <span className="text-xs text-[var(--text-secondary)]">
          Период: {formatAdminDateTime(report.from)} — {formatAdminDateTime(report.to)} (по умолчанию 90 дней)
        </span>
      </form>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Выручка за период"
          value={formatRub(
            report.revenue_by_month.reduce((sum, row) => sum + row.amount_minor - row.refunded_minor, 0) / 100,
          )}
          hint="оплаты минус возвраты"
        />
        <StatCard label="Новых участников" value={report.new_users} />
        <StatCard
          label="Покупают повторно"
          value={report.buyers ? `${Math.round((100 * report.repeat_buyers) / report.buyers)}%` : "—"}
          hint={`${report.repeat_buyers} из ${report.buyers} покупателей`}
        />
        <StatCard label="Выдано студией" value={lessonsCount(report.granted_lessons)} hint="без оплаты онлайн" />
      </section>

      <Revenue report={report} />
      <Fill title="Заполняемость по направлениям" rows={report.fill_by_direction} label={(row) => row.label ?? String(row.key)} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Fill title="По дням недели" rows={report.fill_by_weekday} label={(row) => WEEKDAYS[Number(row.key)] ?? String(row.key)} />
        <Fill title="По времени начала" rows={report.fill_by_hour} label={(row) => `${row.key}:00`} />
      </div>

      <section className={SECTION}>
        <h2 className={H2}>Отмены записей</h2>
        <p className="text-sm">
          Всего записей на занятия периода: {report.cancellations.total}; отменили
          сами участники: {report.cancellations.by_users}; отменено студией:{" "}
          {report.cancellations.by_studio}.
        </p>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>
          «Спящие»: есть занятия на балансе, но нет записи {report.sleeping_days} дн.
        </h2>
        {report.sleeping_clients.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Таких участников нет.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {report.sleeping_clients.map((client) => (
              <li key={client.telegram_id} className="flex flex-wrap gap-x-3">
                <Link href={`/admin/users/${client.telegram_id}`} className="text-[var(--primary-text)] underline-offset-4 hover:underline">
                  {client.user_name}
                </Link>
                <span>{lessonsCount(client.lesson_credits)}</span>
                <span className="text-[var(--text-secondary)]">
                  последняя запись: {client.last_booking_at ? formatAdminDateTime(client.last_booking_at) : "не было"}
                </span>
                {client.phone && <span className="text-[var(--text-secondary)]">{formatPhone(client.phone)}</span>}
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/broadcasts" className="text-sm text-[var(--primary-text)] underline-offset-4 hover:underline">
          Написать им — «Рассылки», сегмент «с занятиями на балансе» →
        </Link>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Выгрузки CSV (Excel)</h2>
        <div className="flex flex-wrap gap-2">
          <Link prefetch={false} href={`/admin/export/payments?${exportQuery}`} className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm`}>
            Платежи за период
          </Link>
          <Link prefetch={false} href={`/admin/export/bookings?${exportQuery}`} className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm`}>
            Записи за период
          </Link>
          <Link prefetch={false} href="/admin/export/clients" className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm`}>
            Все участники
          </Link>
        </div>
      </section>
    </div>
  );
}

function Revenue({ report }: { report: AdminReport }) {
  return (
    <section className={SECTION}>
      <h2 className={H2}>Выручка по месяцам</h2>
      {report.revenue_by_month.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">Оплат за период нет.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-[var(--text-secondary)]">
            <tr>
              <th className="py-1">Месяц</th>
              <th className="py-1">Оплат</th>
              <th className="py-1">Сумма</th>
              <th className="py-1">Возвраты</th>
            </tr>
          </thead>
          <tbody>
            {report.revenue_by_month.map((row) => (
              <tr key={row.month} className="border-t border-[var(--border)]">
                <td className="py-1">{row.month}</td>
                <td className="py-1">{row.payments}</td>
                <td className="py-1">{formatRub(row.amount_minor / 100)}</td>
                <td className="py-1">{row.refunded ? `${row.refunded} · ${formatRub(row.refunded_minor / 100)}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {report.packages.length > 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          По абонементам:{" "}
          {report.packages.map((row) => `${row.title} — ${row.payments} (${formatRub(row.amount_minor / 100)})`).join("; ")}
        </p>
      )}
    </section>
  );
}

function Fill({
  title,
  rows,
  label,
}: {
  title: string;
  rows: AdminReport["fill_by_direction"];
  label: (row: AdminReport["fill_by_direction"][number]) => string;
}) {
  return (
    <section className={SECTION}>
      <h2 className={H2}>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">Прошедших занятий за период нет.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {rows.map((row) => (
            <li key={String(row.key)} className="flex items-center gap-3">
              <span className="w-40 shrink-0">{label(row)}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                <span
                  className="block h-full rounded-full bg-[var(--primary)]"
                  style={{ width: percent(row.booked, row.capacity) === "—" ? "0%" : percent(row.booked, row.capacity) }}
                />
              </span>
              <span className="w-32 shrink-0 text-right text-[var(--text-secondary)]">
                {percent(row.booked, row.capacity)} · {row.slots} зан.
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
