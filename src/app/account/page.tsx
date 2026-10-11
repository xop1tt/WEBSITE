import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyPackages, getProfile, type PackageSummary } from "@/lib/account";
import { getCurrentUser } from "@/lib/auth";
import { SetCredentialsForm } from "@/components/SetCredentialsForm";
import { isServiceFailure } from "@/lib/apiResult";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import Link from "next/link";
import { formatClassDateTime, lessonsCount, formatPhone } from "@/lib/format";
import {
  GLASS_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
  SUCCESS_NOTICE_CLASS,
} from "@/lib/glass";

export const metadata: Metadata = {
  title: "Профиль",
};

type SearchParams = Promise<{ credentials?: string }>;

export default async function AccountProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { credentials } = await searchParams;
  const [result, currentUser, packages] = await Promise.all([
    getProfile(),
    getCurrentUser(),
    getMyPackages(),
  ]);

  if (!result.ok && result.error === "unauthorized") {
    redirect("/login");
  }
  if (isServiceFailure(result)) {
    return <ServiceUnavailableNotice />;
  }
  if (!result.ok) {
    return (
      <p className="text-[var(--text-secondary)]">
        Не удалось загрузить профиль. Попробуйте обновить страницу позже.
      </p>
    );
  }
  const profile = result.data;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[24px] glass-medium p-6">
        <h2 className="mb-4 font-heading text-xl font-bold tracking-tight">Профиль</h2>
        <dl className="flex flex-col gap-3">
          <Row label="Имя" value={profile.user_name} />
          <Row label="Телефон" value={profile.phone ? formatPhone(profile.phone) : "не указан"} />
        </dl>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Имя и телефон меняются в Telegram-боте студии: «👤 Профиль».
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-[24px] glass-medium p-6">
        <h2 className="font-heading text-xl font-bold tracking-tight">Вход на сайт</h2>
        {credentials === "1" && (
          <p className={SUCCESS_NOTICE_CLASS}>
            Email и пароль сохранены — теперь можно входить и по ним.
          </p>
        )}
        <dl className="flex flex-col gap-3">
          <Row label="Telegram" value="привязан ✓" />
          {currentUser?.email && <Row label="Email" value={currentUser.email} />}
        </dl>
        {currentUser && !currentUser.email && (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Задайте email и пароль, чтобы входить на сайт и без Telegram.
              Это тот же аккаунт — баланс и записи общие.
            </p>
            <SetCredentialsForm />
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] glass-medium p-6">
        <div>
          <h2 className="mb-1 font-heading text-xl font-bold tracking-tight">Баланс</h2>
          <p className="text-2xl font-bold text-[var(--primary-text)]">
            {lessonsCount(profile.lesson_credits)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/schedule" className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm`}>
            Записаться
          </Link>
          <Link href="/packages" className={`${GLASS_BUTTON_CLASS} px-5 py-2 text-sm`}>
            Абонементы
          </Link>
        </div>
      </section>

      {packages.ok && <MyPackages summary={packages.data} />}
    </div>
  );
}

const DATE = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function MyPackages({ summary }: { summary: PackageSummary }) {
  const active = summary.packages
    .filter((item) => item.status === "active")
    .sort((a, b) => (a.expires_at ?? "9999").localeCompare(b.expires_at ?? "9999"));
  const finished = summary.packages.filter((item) => item.status !== "active").slice(-5);
  if (active.length === 0 && finished.length === 0 && summary.unallocated === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-4 rounded-[24px] glass-medium p-6">
      <h2 className="font-heading text-xl font-bold tracking-tight">Мои абонементы</h2>
      {active.length > 0 && (
        <ul className="flex flex-col gap-2">
          {active.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-medium">{item.title}</span>
              <span className="text-[var(--text-secondary)]">
                осталось {item.remaining} из {item.lessons}
              </span>
              <span className="text-sm text-[var(--text-secondary)]">
                {item.expires_at
                  ? `действуют до ${formatClassDateTime(item.expires_at)}`
                  : "бессрочно"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {summary.unallocated > 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          Бессрочно (возврат за отменённые студией занятия):{" "}
          {lessonsCount(summary.unallocated)}.
        </p>
      )}
      {active.length > 1 && (
        <p className="text-sm text-[var(--text-secondary)]">
          Сначала расходуется абонемент, который сгорает раньше.
        </p>
      )}
      {finished.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-[var(--text-secondary)]">Завершённые</summary>
          <ul className="mt-2 flex flex-col gap-1 text-[var(--text-secondary)]">
            {finished.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                {item.title} — {item.status_label} · с {DATE.format(new Date(item.acquired_at))}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
      <dt className="w-40 shrink-0 font-medium">{label}</dt>
      <dd className="text-[var(--text-secondary)]">{value}</dd>
    </div>
  );
}
