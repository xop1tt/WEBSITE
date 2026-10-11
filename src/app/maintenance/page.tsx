import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/backend";
import { formatClassDateTime } from "@/lib/format";
import { GLASS_BUTTON_CLASS } from "@/lib/glass";
import {
  DEFAULT_MAINTENANCE_DESCRIPTION,
  DEFAULT_MAINTENANCE_TITLE,
  effectiveMode,
  fetchMaintenanceStatus,
} from "@/lib/maintenance";
import { MaintenanceCountdown, MaintenanceRetryButton } from "@/components/MaintenanceCountdown";

export const metadata: Metadata = {
  title: "Технические работы",
  // Сама по себе страница не для поиска; во время работ её HTML уходит с
  // ответом 503 (src/proxy.ts), который поисковики и так не индексируют.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
// Ожидание backend: страница не должна «висеть» — без ответа показываем
// тексты по умолчанию.
const STATUS_TIMEOUT_MS = 3_000;

/**
 * Страница технического обслуживания. Показывается вместо любой обычной
 * страницы сайта, пока работы идут (proxy), и по прямому адресу. Шапка и
 * подвал сайта на ней скрыты (.maintenance-screen в globals.css): ссылки
 * навигации всё равно вели бы сюда же.
 */
async function loadState() {
  const status = await fetchMaintenanceStatus(API_BASE_URL, STATUS_TIMEOUT_MS);
  const now = Date.now();
  return {
    status,
    // Состояние неизвестно (backend не ответил) — показываем страницу
    // работ: сюда попадают, когда proxy уже решил, что они идут.
    active: status === null || effectiveMode(status, now) === "active",
    serverTime: status?.server_time ?? new Date(now).toISOString(),
  };
}

export default async function MaintenancePage() {
  const { status, active, serverTime } = await loadState();

  return (
    <div className="maintenance-screen mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center gap-8 px-4 py-12 sm:py-16">
      <p className="font-heading text-[22px] font-bold tracking-wide text-[var(--accent-dark)] sm:text-[26px]">
        Mirada Studio
      </p>

      {active ? (
        <>
          <div className="flex flex-col gap-4">
            <span className="maintenance-indicator glass-subtle inline-flex w-fit items-center gap-2.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-[var(--text-secondary)]">
              <span className="maintenance-dot" aria-hidden="true" />
              Идут технические работы
            </span>
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
              {status?.title ?? DEFAULT_MAINTENANCE_TITLE}
            </h1>
            <p className="whitespace-pre-line text-lg leading-relaxed text-[var(--text-secondary)]">
              {status?.description ?? DEFAULT_MAINTENANCE_DESCRIPTION}
            </p>
          </div>

          <section
            aria-labelledby="maintenance-eta"
            className="flex flex-col gap-4 rounded-[28px] glass-medium p-6 sm:p-7"
          >
            <MaintenanceCountdown
              endsAt={status?.ends_at ?? null}
              endsAtLabel={status?.ends_at ? formatClassDateTime(status.ends_at) : null}
              serverTime={serverTime}
            />
          </section>

          <div className="flex flex-col gap-3">
            <p className="text-base leading-relaxed text-[var(--text-secondary)]">
              Telegram-бот студии работает как обычно: в нём можно посмотреть
              расписание, записаться на занятие и задать вопрос.
            </p>
            <div className="flex flex-wrap gap-3">
              {TELEGRAM_BOT_USERNAME && (
                <a
                  href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center rounded-full px-6 py-3 text-base font-semibold"
                >
                  Открыть Telegram-бот
                </a>
              )}
              <MaintenanceRetryButton className={`${GLASS_BUTTON_CLASS} px-6 py-3 text-base`} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Сайт работает
          </h1>
          <p className="text-lg leading-relaxed text-[var(--text-secondary)]">
            {status?.mode === "scheduled" && status.starts_at
              ? `Технические работы запланированы на ${formatClassDateTime(status.starts_at)} по времени студии. До их начала сайт работает как обычно.`
              : "Технических работ сейчас нет — можно возвращаться к занятиям."}
          </p>
          <Link
            href="/"
            className="btn-primary inline-flex w-fit items-center rounded-full px-6 py-3 text-base font-semibold"
          >
            Вернуться на сайт
          </Link>
        </div>
      )}
    </div>
  );
}
