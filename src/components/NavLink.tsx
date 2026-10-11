"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEM_CLASS } from "@/lib/glass";

// Блик под курсором ведёт общий GlassController — своих обработчиков нет.

export function NavLink({
  href,
  children,
  className,
  label,
}: {
  href: string;
  children: React.ReactNode;
  // Базовые классы вместо NAV_ITEM_CLASS — для круглых контролов шапки
  // (цвет текста тогда задают они сами).
  className?: string;
  // Подпись для иконки без текста (aria-label и подсказка).
  label?: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      aria-label={label}
      title={label}
      className={`${className ?? NAV_ITEM_CLASS} ${
        isActive
          ? "text-[var(--primary-text)]"
          : `${className ? "" : "text-[var(--text-secondary)]"} hover:text-[var(--primary-text)]`
      }`}
    >
      {children}
    </Link>
  );
}
