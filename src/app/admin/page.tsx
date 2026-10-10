import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminDashboard } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { isServiceFailure } from "@/lib/apiResult";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { StatCard, formatRub } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Сводка",
};

export default async function AdminDashboardPage() {
  // Преподавателю сводка недоступна — его раздел начинается с расписания.
  if ((await getCurrentUser())?.role === "teacher") {
    redirect("/admin/schedule");
  }
  const result = await getAdminDashboard();
  if (!result.ok) {
    return isServiceFailure(result) ? (
      <ServiceUnavailableNotice />
    ) : (
      <p className="text-[var(--text-secondary)]">Нет доступа к сводке.</p>
    );
  }
  const data = result.data;

  return (
    <div className="flex flex-col gap-8">
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

      <p className="text-sm text-[var(--text-secondary)]">
        Нагрузку на сервер (запросы, CPU, память, база данных) показывает окно
        «Нагрузка» в правом нижнем углу на любой странице сайта.{" "}
        <Link
          href="/admin/schedule"
          className="font-medium text-[var(--primary-text)] underline-offset-4 hover:underline"
        >
          К расписанию →
        </Link>
      </p>
    </div>
  );
}
