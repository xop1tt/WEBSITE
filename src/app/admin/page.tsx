import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminDashboard, getAdminSlots, type AdminDashboard, type AdminSlot } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { isServiceFailure } from "@/lib/apiResult";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { StatCard, formatAdminDateTime, formatRub } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Сводка",
};

export default async function AdminDashboardPage() {
  // Преподавателю сводка недоступна — его раздел начинается с расписания.
  if ((await getCurrentUser())?.role === "teacher") {
    redirect("/admin/schedule");
  }
  const [result, slotsResult] = await Promise.all([getAdminDashboard(), getAdminSlots()]);
  if (!result.ok) {
    return isServiceFailure(result) ? (
      <ServiceUnavailableNotice />
    ) : (
      <p className="text-[var(--text-secondary)]">Нет доступа к сводке.</p>
    );
  }
  const data = result.data;
  const attention = attentionItems(data, slotsResult.ok ? slotsResult.data : []);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-bold tracking-tight">Требует внимания</h2>
        {attention.length === 0 ? (
          <p className="rounded-[24px] glass-medium p-5 text-[var(--text-secondary)]">
            Всё спокойно: обращений и неоплаченных платежей нет, у ближайших занятий есть
            преподаватель.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {attention.map((item) => (
              <li key={item.text}>
                <Link
                  href={item.href}
                  className="glass-medium glass-interactive flex items-center justify-between gap-4 rounded-[20px] px-5 py-3.5"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{item.text}</span>
                    {item.hint && (
                      <span className="text-sm text-[var(--text-secondary)]">{item.hint}</span>
                    )}
                  </span>
                  <span aria-hidden="true" className="text-[var(--primary-text)]">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-bold tracking-tight">Сегодня</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Занятий" value={data.slots_today} />
          <StatCard label="Записей" value={data.bookings_today} />
          <StatCard label="Свободных мест" value={data.free_seats_today} />
          <StatCard
            label="Новых участников"
            value={data.new_profiles_today + data.new_web_users_today}
            hint={`бот ${data.new_profiles_today} · сайт ${data.new_web_users_today}`}
          />
          <StatCard
            label="Продаж"
            value={data.sales_today_count}
            hint={formatRub(data.sales_today_rub)}
          />
          <StatCard
            label="Открытых обращений"
            value={data.open_tickets}
            accent={data.open_tickets > 0}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-bold tracking-tight">Ближайшие 7 дней</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Занятий" value={data.slots_week} />
          <StatCard label="Записей" value={data.bookings_week} />
          <StatCard label="Свободных мест" value={data.free_seats_week} />
          <StatCard
            label="Заполненность"
            value={
              data.bookings_week + data.free_seats_week > 0
                ? `${Math.round((100 * data.bookings_week) / (data.bookings_week + data.free_seats_week))}%`
                : "—"
            }
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-bold tracking-tight">Участники и продажи</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Профилей в боте" value={data.total_profiles} />
          <StatCard label="Аккаунтов на сайте" value={data.total_web_users} />
          <StatCard label="Онлайн в боте (5 мин)" value={data.online_users} />
          <StatCard
            label="Продаж за 30 дней"
            value={formatRub(data.sales_month_rub)}
            hint={`${data.sales_month_count} оплат · ожидают оплаты: ${data.pending_payments}`}
          />
        </div>
      </section>

    </div>
  );
}

type AttentionItem = { text: string; hint?: string; href: string };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

// Что админу стоит сделать сейчас — вместо того чтобы искать это по
// карточкам с цифрами.
function attentionItems(data: AdminDashboard, slots: AdminSlot[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (data.open_tickets > 0) {
    items.push({ text: `Открытых обращений: ${data.open_tickets}`, href: "/admin/support" });
  }
  if (data.pending_payments > 0) {
    items.push({
      text: `Ожидают оплаты: ${data.pending_payments}`,
      hint: "Платёж создан, но деньги ещё не пришли",
      href: "/admin/payments?status=pending",
    });
  }
  // Время сравниваем с моментом запроса — это серверный компонент.
  const now = Date.now();
  const upcoming = slots.filter((slot) => {
    const start = new Date(slot.starts_at).getTime();
    return slot.status !== "cancelled" && start > now && start - now < WEEK_MS;
  });
  const noTeacher = upcoming.filter((slot) => slot.teacher_telegram_id === null);
  if (noTeacher.length > 0) {
    items.push({
      text: `Занятий без преподавателя на неделе: ${noTeacher.length}`,
      hint: `Ближайшее — ${noTeacher[0].class_label}, ${formatAdminDateTime(noTeacher[0].starts_at)}`,
      href: "/admin/schedule",
    });
  }
  const emptySoon = upcoming.filter(
    (slot) => slot.booked === 0 && new Date(slot.starts_at).getTime() - now < TWO_DAYS_MS,
  );
  if (emptySoon.length > 0) {
    items.push({
      text: `Пустых занятий в ближайшие 2 дня: ${emptySoon.length}`,
      hint: "Никто не записан — можно напомнить в «Рассылках»",
      href: "/admin/broadcasts",
    });
  }
  const full = upcoming.filter((slot) => slot.status === "open" && slot.remaining === 0);
  if (full.length > 0) {
    items.push({
      text: `Заполнены на неделе: ${full.length}`,
      hint: "Можно добавить ещё одно занятие в это время",
      href: "/admin/schedule",
    });
  }
  return items;
}
