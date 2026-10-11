// Общие наборы классов glass design system (см. globals.css). Отдельный
// не-клиентский модуль: строки отсюда нужны и серверным компонентам
// (SiteHeader), и клиентским (NavLink).

// Навигация: subtle-стекло в режиме ghost — проявляется на hover/focus и на
// текущей странице. inline-flex + items-center центрируют текст по боксу.
export const NAV_ITEM_CLASS =
  "glass-subtle glass-interactive glass-ghost inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-[18px] font-semibold leading-none md:px-2.5 md:text-base lg:px-3 lg:text-[18px]";

// Круглый контрол шапки 40×40 (тема, выход, меню, иконка кабинета): одна
// высота с кнопкой «Войти», не сжимается при нехватке ширины.
export const HEADER_CONTROL_CLASS =
  "glass-subtle glass-interactive flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-primary)]";

// Вторичная кнопка/ссылка: прозрачное стекло с тонкой кромкой; на hover
// кромка ярче и появляется внутренний блик, без свечения вокруг. Размеры
// (padding, шрифт) задаёт вызывающий — они у кнопок разные. Над живым фоном
// (сцена главной) добавлять glass-float — включает размытие подложки.
export const GLASS_BUTTON_CLASS =
  "glass-subtle glass-interactive inline-flex items-center justify-center rounded-full font-medium";

// Основное действие: то же жидкое стекло, но тонированное бордовым
// (.btn-primary). Размеры задаёт вызывающий.
export const PRIMARY_BUTTON_CLASS =
  "btn-primary rounded-full font-semibold";

// Поле ввода (input/textarea/select) — как форма обращения в поддержку.
export const INPUT_CLASS =
  "glass-quiet w-full rounded-2xl px-3 py-2.5 text-base transition-[border-color] focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[color-mix(in_srgb,var(--primary)_28%,transparent)]";

// Сообщения об ошибке и успехе.
export const ERROR_NOTICE_CLASS =
  "rounded-2xl border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]";
export const SUCCESS_NOTICE_CLASS =
  "rounded-2xl bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]";
