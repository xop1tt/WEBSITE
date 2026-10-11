import { STUDIO_TIMEZONE } from "@/lib/format";
import Link from "next/link";
import { ERROR_NOTICE_CLASS, GLASS_BUTTON_CLASS, SUCCESS_NOTICE_CLASS } from "@/lib/glass";

// Общие мелкие элементы админ-панели (серверные компоненты).

export function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-[24px] glass-medium p-5 ${accent ? "glass-accent" : ""}`}
    >
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="font-heading text-3xl font-bold tracking-tight text-[var(--primary-text)]">
        {value}
      </span>
      {hint && <span className="text-xs text-[var(--text-secondary)]">{hint}</span>}
    </div>
  );
}

/** Вкладки внутри раздела («Открытые/Закрытые», «Операции/Журнал/Сверка»):
 *  мельче меню админки, текущая — цветом текста, как в меню. */
export function SubTabs({ tabs }: { tabs: { href: string; label: string; active: boolean }[] }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm ${
            tab.active
              ? "font-semibold text-[var(--primary-text)]"
              : "text-[var(--text-secondary)] hover:text-[var(--primary-text)]"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function Notices({ notice, error }: { notice?: string; error?: string }) {
  return (
    <>
      {notice && <p className={SUCCESS_NOTICE_CLASS}>{notice}</p>}
      {error && (
        <p role="alert" className={ERROR_NOTICE_CLASS}>
          {error}
        </p>
      )}
    </>
  );
}

const BADGE_TONES = {
  success: "bg-[var(--success-bg)] text-[var(--success-text)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger-text)]",
  // Заметная сплошная плашка — состояние, которое админу нужно видеть сразу.
  alert: "bg-[var(--danger)] font-semibold text-white",
  neutral: "glass-subtle text-[var(--text-secondary)]",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[24px] glass-medium p-6 text-[var(--text-secondary)]">{children}</p>
  );
}

const DATE_TIME = new Intl.DateTimeFormat("ru-RU", {
  timeZone: STUDIO_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** «08.10.26, 19:00» в поясе студии. */
export function formatAdminDateTime(iso: string | null): string {
  return iso ? DATE_TIME.format(new Date(iso)) : "—";
}

const RUB = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

export function formatRub(value: number): string {
  return RUB.format(value);
}
