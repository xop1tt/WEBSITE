"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GLASS_BUTTON_CLASS } from "@/lib/glass";

const ACCOUNT_LINKS = [
  { href: "/account", label: "Профиль" },
  { href: "/account/bookings", label: "Мои занятия" },
  { href: "/account/payments", label: "Платежи" },
  { href: "/account/support", label: "Помощь" },
];

// «/account» совпадает только сам с собой; остальные вкладки — и вложенные
// страницы (например, /account/support/123).
function isActive(pathname: string, href: string) {
  return href === "/account" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Личный кабинет">
      {ACCOUNT_LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "btn-primary rounded-full px-4 py-2 text-sm font-medium"
                : `${GLASS_BUTTON_CLASS} px-4 py-2 text-sm`
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
