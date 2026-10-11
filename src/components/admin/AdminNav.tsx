"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEM_CLASS } from "@/lib/glass";
import { LinkPendingHint } from "@/components/LinkPendingHint";

export type AdminRole = "admin" | "teacher";

/** Счётчики «требует внимания» на вкладках (из сводки backend). */
export type AdminNavCounts = Partial<Record<string, number>>;

type Item = { href: string; label: string; roles: readonly AdminRole[] };
type Group = { label: string; items: readonly Item[] };

// Разделы по смыслу: 14 вкладок подряд занимали два ряда на компьютере и
// весь первый экран на телефоне. Сверху — группа, под ней — её разделы.
// Это лишь навигация — права проверяет backend на каждом /api/admin/*.
const GROUPS: readonly Group[] = [
  {
    label: "Работа",
    items: [
      { href: "/admin", label: "Сводка", roles: ["admin"] },
      { href: "/admin/schedule", label: "Расписание", roles: ["admin", "teacher"] },
      { href: "/admin/users", label: "Участники", roles: ["admin"] },
      { href: "/admin/support", label: "Поддержка", roles: ["admin", "teacher"] },
    ],
  },
  {
    label: "Деньги",
    items: [
      { href: "/admin/payments", label: "Платежи", roles: ["admin"] },
      { href: "/admin/finance", label: "Финансы", roles: ["admin"] },
      { href: "/admin/reports", label: "Отчёты", roles: ["admin"] },
    ],
  },
  {
    label: "Связь",
    items: [
      { href: "/admin/broadcasts", label: "Рассылки", roles: ["admin"] },
      { href: "/admin/notifications", label: "Уведомления", roles: ["admin"] },
    ],
  },
  {
    label: "Управление",
    items: [
      { href: "/admin/catalog", label: "Каталог", roles: ["admin"] },
      { href: "/admin/settings", label: "Настройки", roles: ["admin"] },
      { href: "/admin/staff", label: "Сотрудники", roles: ["admin"] },
      { href: "/admin/maintenance", label: "Обслуживание", roles: ["admin"] },
      { href: "/admin/system", label: "Система", roles: ["admin"] },
    ],
  },
];

// /admin/users/123 — внутри «Участников»; «/admin» совпадает только сам с собой.
function matches(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ role, counts = {} }: { role: AdminRole; counts?: AdminNavCounts }) {
  const pathname = usePathname();
  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
  const activeGroup =
    groups.find((group) => group.items.some((item) => matches(pathname, item.href))) ?? groups[0];
  const sum = (group: (typeof groups)[number]) =>
    group.items.reduce((total, item) => total + (counts[item.href] ?? 0), 0);

  return (
    <nav aria-label="Разделы админки" className="flex flex-col gap-2">
      {/* У преподавателя одна группа — строка групп ему не нужна. */}
      {groups.length > 1 && (
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {groups.map((group) => {
            const active = group === activeGroup;
            const count = sum(group);
            return (
              <Link
                key={group.label}
                href={group.items[0].href}
                aria-current={active ? "true" : undefined}
                className={`glass-subtle glass-interactive inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[15px] font-semibold sm:px-4 sm:text-base ${
                  active
                    ? "glass-accent text-[var(--primary-text)]"
                    : "glass-ghost text-[var(--text-secondary)] hover:text-[var(--primary-text)]"
                }`}
              >
                {group.label}
                {count > 0 && <CountBadge value={count} />}
                <LinkPendingHint />
              </Link>
            );
          })}
        </div>
      )}
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {activeGroup.items.map((item) => {
          const active = matches(pathname, item.href);
          const count = counts[item.href] ?? 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${NAV_ITEM_CLASS} shrink-0 gap-2 !text-base ${
                active
                  ? "text-[var(--primary-text)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--primary-text)]"
              }`}
            >
              {item.label}
              {count > 0 && <CountBadge value={count} />}
              <LinkPendingHint />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function CountBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-xs font-semibold leading-none text-[var(--on-primary)]">
      {value > 99 ? "99+" : value}
    </span>
  );
}
