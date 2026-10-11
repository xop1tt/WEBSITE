import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Suspense } from "react";
import { getAdminDashboard } from "@/lib/admin";
import { AdminNav, type AdminRole } from "@/components/admin/AdminNav";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";

export const metadata: Metadata = {
  title: { default: "Админка", template: "%s — Админка" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Счётчики на вкладках: открытые обращения и неоплаченные платежи. Грузятся
// отдельно (Suspense) — раздел не ждёт сводку.
async function AdminNavWithCounts({ role }: { role: AdminRole }) {
  if (role !== "admin") return <AdminNav role={role} />;
  const dashboard = await getAdminDashboard();
  const counts = dashboard.ok
    ? {
        "/admin/support": dashboard.data.open_tickets,
        "/admin/payments": dashboard.data.pending_payments,
      }
    : {};
  return <AdminNav role={role} counts={counts} />;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session.status === "anonymous") {
    redirect("/login?next=/admin");
  }
  if (session.status === "unavailable") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <ServiceUnavailableNotice />
      </div>
    );
  }
  // Не сотруднику раздел «не существует». Это только интерфейс:
  // каждый /api/admin/* сам отвечает 403.
  const role = session.user.role;
  if (!role) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-bold tracking-tight">
          {role === "admin" ? "Админка" : "Кабинет преподавателя"}
        </h1>
      </div>
      <Suspense fallback={<AdminNav role={role} />}>
        <AdminNavWithCounts role={role} />
      </Suspense>
      {children}
    </div>
  );
}
