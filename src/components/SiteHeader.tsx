import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import Link from "next/link";
import { HEADER_CONTROL_CLASS, NAV_ITEM_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { NavLink } from "./NavLink";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { href: "/schedule", label: "Записаться" },
  { href: "/packages", label: "Абонементы" },
  { href: "/contact", label: "Контакты" },
];

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function UserIcon() {
  return (
    <svg {...ICON_PROPS} className="shrink-0">
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M14 4.5H7.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14" />
      <path d="M11 12h9M17 8.5l3.5 3.5-3.5 3.5" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

// Слот «кабинет / войти» — одно место в шапке для обоих состояний, высота
// 40px как у круглых контролов. Кабинет до lg — круглая иконка, шире — иконка
// и имя, обрезанное многоточием: длинное имя не раздвигает шапку.
function AccountSlot({ user }: { user: CurrentUser | null }) {
  if (!user) {
    return (
      <Link
        href="/login"
        className={`${PRIMARY_BUTTON_CLASS} inline-flex h-10 shrink-0 items-center whitespace-nowrap px-4 text-base leading-none lg:px-5 lg:text-[18px]`}
      >
        Войти
      </Link>
    );
  }
  return (
    <NavLink
      href="/account"
      label={`Личный кабинет: ${user.display_name}`}
      className={`${HEADER_CONTROL_CLASS} gap-1.5 lg:w-auto lg:max-w-[10.5rem] lg:px-3.5 xl:max-w-[13rem]`}
    >
      <UserIcon />
      <span className="hidden min-w-0 truncate text-base font-semibold leading-normal lg:block">{user.display_name}</span>
    </NavLink>
  );
}

export async function SiteHeader() {
  const currentUser = await getCurrentUser();

  return (
    // Шапка — плавающая стеклянная панель (.site-header-bar, globals.css)
    // с отступом от краёв экрана; .site-header вокруг неё прозрачен и не
    // ловит клики. С прокруткой меняется только плотность стекла
    // (GlassController) — состав, размеры и положение элементов от прокрутки
    // не зависят. На главной шапка лежит поверх сцены, не сдвигая её (см.
    // body:has(.scenes)).
    <header className="site-header">
      {/* Ширина капсулы не зависит от содержимого (w-full до max-w-5xl):
          вход и выход не сдвигают логотип и правую группу. Слева логотип,
          в середине навигация (занимает остаток и центрируется в нём), справа
          контролы в постоянном порядке: [Админка] [Выйти] [Кабинет | Войти]
          [Тема] — тема всегда у правого края, слот кабинета/входа вплотную к
          ней в любом состоянии авторизации. */}
      <div className="site-header-bar mx-auto flex w-full max-w-5xl items-center gap-2 sm:gap-3">
        <Link
          href="/"
          className="font-heading min-w-0 truncate text-[17px] font-bold tracking-wide text-[var(--accent-dark)] sm:text-[20px] md:shrink-0 lg:text-[24px]"
        >
          Mirada Studio
        </Link>

        {/* Полное меню — только от md и шире. На мобильном оно переносилось в
            несколько строк и съедало четверть экрана, поэтому ниже есть
            отдельная компактная версия. */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {currentUser?.role && (
            <NavLink href="/admin" label="Админка" className={HEADER_CONTROL_CLASS}>
              <AdminIcon />
            </NavLink>
          )}
          {currentUser && (
            <form action={logoutAction} className="flex">
              <button
                type="submit"
                aria-label="Выйти из аккаунта"
                title="Выйти"
                className={`${HEADER_CONTROL_CLASS} hover:text-[var(--primary-text)]`}
              >
                <LogoutIcon />
              </button>
            </form>
          )}
          <AccountSlot user={currentUser} />
          <ThemeToggle />
        </div>

        {/* Компактная шапка на мобильном: лого + кнопка записи + тема + меню.
            Кабинет/вход и выход — в меню, всегда в его нижнем блоке. */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:hidden">
          <Link
            href="/schedule"
            className={`${PRIMARY_BUTTON_CLASS} whitespace-nowrap px-3.5 py-2 text-sm leading-none`}
          >
            Записаться
          </Link>
          <ThemeToggle />
          <MobileNav links={NAV_LINKS}>
            <div className="mt-2 flex flex-col items-stretch gap-1 border-t border-[var(--border)] pt-2">
              {currentUser ? (
                <>
                  {currentUser.role && <NavLink href="/admin">Админка</NavLink>}
                  <NavLink href="/account">
                    <span className="min-w-0 truncate leading-normal">{currentUser.display_name}</span>
                  </NavLink>
                  <form action={logoutAction} className="flex flex-col">
                    <button type="submit" className={`${NAV_ITEM_CLASS} text-[var(--text-secondary)] hover:text-[var(--primary-text)]`}>
                      Выйти
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className={`${PRIMARY_BUTTON_CLASS} inline-flex h-10 items-center justify-center text-base leading-none`}
                >
                  Войти
                </Link>
              )}
            </div>
          </MobileNav>
        </div>
      </div>
    </header>
  );
}
