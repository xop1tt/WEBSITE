import type { Metadata } from "next";
import Link from "next/link";
import { getPackages } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { PackagesGrid } from "@/components/PackagesGrid";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";

export const metadata: Metadata = {
  title: "Абонементы",
};

// Цены и состав абонементов задаёт backend — не кэшируем статически на
// этапе сборки, иначе сайт будет показывать устаревший каталог.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ checkout_error?: string }>;

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { checkout_error: checkoutError } = await searchParams;
  const [packages, currentUser] = await Promise.all([
    getPackages(),
    getCurrentUser(),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">Абонементы</h1>
      </div>
      <p className="max-w-2xl text-lg text-[var(--text-secondary)]">
        Разовое занятие или абонемент на несколько занятий — цены и состав
        всегда актуальны, их определяет студия.
      </p>
      {checkoutError && (
        <p className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
          {checkoutError}
        </p>
      )}
      {!currentUser && (
        <p className="text-sm text-[var(--text-secondary)]">
          Для покупки войдите по email или через Telegram. Абонемент
          зачисляется на профиль в Telegram-боте студии — это тот же аккаунт,
          поэтому к нему нужно привязать Telegram.
        </p>
      )}
      {currentUser && currentUser.telegram_id === null && (
        <p className="rounded-2xl glass-subtle px-4 py-3 text-sm text-[var(--text-secondary)]">
          Чтобы купить абонемент, привяжите Telegram в{" "}
          <Link
            href="/account"
            className="font-medium text-[var(--primary-text)] underline-offset-4 hover:underline"
          >
            личном кабинете
          </Link>
          : баланс занятий общий с ботом студии.
        </p>
      )}
      {packages.ok ? (
        <PackagesGrid
          packages={packages.data}
          isAuthenticated={currentUser !== null}
          hasTelegram={currentUser?.telegram_id != null}
        />
      ) : (
        <ServiceUnavailableNotice />
      )}
    </div>
  );
}
