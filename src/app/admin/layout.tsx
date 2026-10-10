import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";

export const metadata: Metadata = {
  title: { default: "Админка", template: "%s — Админка" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Разделы по роли: преподаватель видит только свои занятия и поддержку.
// Это лишь навигация — права проверяет backend на каждом /api/admin/*.
const ADMIN_LINKS = [
  { href: "/admin", label: "Сводка", roles: ["admin"] },
  { href: "/admin/schedule", label: "Расписание", roles: ["admin", "teacher"] },
  { href: "/admin/users", label: "Участники", roles: ["admin"] },
  { href: "/admin/payments", label: "Платежи", roles: ["admin"] },
  { href: "/admin/finance", label: "Финансы", roles: ["admin"] },
  { href: "/admin/support", label: "Поддержка", roles: ["admin", "teacher"] },
  { href: "/admin/catalog", label: "Каталог", roles: ["admin"] },
  { href: "/admin/settings", label: "Настройки", roles: ["admin"] },
  { href: "/admin/staff", label: "Сотрудники", roles: ["admin"] },
] as const;

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
        <span className="eyebrow">Mirada Studio</span>
        <h1 className="font-heading text-4xl font-bold tracking-tight">
          {role === "admin" ? "Админка" : "Кабинет преподавателя"}
        </h1>
      </div>
      <nav className="flex flex-wrap gap-1">
        {ADMIN_LINKS.filter((link) => (link.roles as readonly string[]).includes(role)).map(
          (link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ),
        )}
      </nav>
      {children}
    </div>
  );
}
