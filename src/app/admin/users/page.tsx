import type { Metadata } from "next";
import { getAdminUsers } from "@/lib/admin";
import { isServiceFailure } from "@/lib/apiResult";
import { GLASS_BUTTON_CLASS, INPUT_CLASS } from "@/lib/glass";
import { lessonsCount } from "@/lib/format";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { Badge, EmptyState, formatAdminDateTime } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Участники",
};

type SearchParams = Promise<{ q?: string }>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "" } = await searchParams;
  const query = q.slice(0, 100);
  const result = await getAdminUsers(query);

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap gap-2" role="search">
        <input
          name="q"
          defaultValue={query}
          placeholder="Имя, email, телефон или Telegram ID"
          maxLength={100}
          className={`${INPUT_CLASS} max-w-md flex-1`}
        />
        <button type="submit" className={`${GLASS_BUTTON_CLASS} px-4 py-2 text-sm`}>
          Найти
        </button>
      </form>
      <p className="text-xs text-[var(--text-secondary)]">
        Одна строка — один человек: аккаунт сайта и профиль бота с тем же
        Telegram показываются вместе.
      </p>

      {!result.ok ? (
        isServiceFailure(result) ? (
          <ServiceUnavailableNotice />
        ) : (
          <EmptyState>Нет доступа.</EmptyState>
        )
      ) : result.data.length === 0 ? (
        <EmptyState>{query ? "Никого не нашли." : "Участников пока нет."}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-[24px] glass-medium">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium">Вход на сайт</th>
                <th className="px-4 py-3 font-medium">Telegram</th>
                <th className="px-4 py-3 font-medium">Телефон</th>
                <th className="px-4 py-3 font-medium">Баланс</th>
                <th className="px-4 py-3 font-medium">Регистрация</th>
                <th className="px-4 py-3 font-medium">Был в боте</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((account) => (
                <tr
                  key={`${account.web_user_id ?? "bot"}-${account.telegram_id ?? "web"}`}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium">
                    <span className="flex flex-wrap items-center gap-2">
                      {account.name}
                      {account.role === "admin" && <Badge tone="success">админ</Badge>}
                      {account.role === "teacher" && <Badge tone="success">преподаватель</Badge>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {account.email ?? (account.web_user_id ? "через Telegram" : "—")}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {account.telegram_id ?? <Badge>не привязан</Badge>}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{account.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    {account.telegram_id ? lessonsCount(account.lesson_credits) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {formatAdminDateTime(account.registered_at)}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {formatAdminDateTime(account.last_seen_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
