"use client";

import { useEffect, useRef, useState } from "react";
import { HEADER_CONTROL_CLASS } from "@/lib/glass";
import { NavLink } from "./NavLink";

type NavItem = { href: string; label: string };

export function MobileNav({
  links,
  children,
}: {
  links: NavItem[];
  // Серверно отрендеренный блок входа/аккаунта — приходит как children,
  // чтобы логика auth/logoutAction оставалась на сервере, а этот компонент
  // отвечал только за открытие/закрытие меню.
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику снаружи и по Escape — ожидаемое поведение для
  // выпадающего меню, иначе единственный способ закрыть его — повторно
  // попасть по кнопке-гамбургеру.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative md:hidden">
      <button
        type="button"
        aria-label={open ? "Закрыть меню" : "Открыть меню"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={HEADER_CONTROL_CLASS}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M5 5l10 10M15 5 5 15" /> : <path d="M3.5 6.5h13M3.5 13.5h13" />}
        </svg>
      </button>
      {open && (
        <div
          data-mobile-menu
          className="glass-dense absolute right-0 top-full mt-3 flex w-60 max-w-[calc(100vw-32px)] flex-col items-stretch gap-1 rounded-[26px] p-2.5"
        >
          {links.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
          {children}
        </div>
      )}
    </div>
  );
}
