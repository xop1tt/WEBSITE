import Link from "next/link";
import { getAdminUsers, type AdminAccount } from "@/lib/admin";
import { INPUT_CLASS } from "@/lib/glass";
import { formatPhone } from "@/lib/format";

// Фильтр «по участнику» для разделов админки: вместо числового Telegram ID,
// который никто не помнит, — тот же поиск, что в «Участниках» (имя, email,
// телефон или Telegram ID). Параметры адреса: who — что ввели, telegram_id —
// кого выбрали из нескольких совпадений.

export type ParticipantFilter =
  | { kind: "none" }
  | { kind: "one"; telegramId: number }
  | { kind: "choose"; matches: AdminAccount[] }
  | { kind: "notFound" };

export async function resolveParticipantFilter(params: {
  who?: string;
  telegram_id?: string;
}): Promise<ParticipantFilter> {
  const picked = Number(params.telegram_id);
  if (Number.isInteger(picked) && picked > 0) return { kind: "one", telegramId: picked };
  const who = params.who?.trim();
  if (!who) return { kind: "none" };
  const found = await getAdminUsers(who);
  // У кого нет Telegram — у того нет баланса и платежей: фильтровать нечем.
  const matches = found.ok ? found.data.filter((user) => user.telegram_id !== null) : [];
  if (matches.length === 1) return { kind: "one", telegramId: matches[0].telegram_id! };
  return matches.length > 1 ? { kind: "choose", matches } : { kind: "notFound" };
}

export function filterTelegramId(filter: ParticipantFilter): number | undefined {
  return filter.kind === "one" ? filter.telegramId : undefined;
}

/** Поле ввода для GET-формы раздела. */
export function ParticipantField({ who }: { who?: string }) {
  return (
    <label className="flex w-72 max-w-full flex-col gap-1 text-xs font-medium">
      Участник
      <input
        name="who"
        type="search"
        defaultValue={who ?? ""}
        placeholder="имя, email, телефон или Telegram ID"
        className={`${INPUT_CLASS} py-1.5`}
      />
    </label>
  );
}

/** Подсказка под формой: несколько совпадений — выбрать; ни одного — сказать. */
export function ParticipantMatches({
  filter,
  hrefFor,
}: {
  filter: ParticipantFilter;
  hrefFor: (user: AdminAccount) => string;
}) {
  if (filter.kind === "notFound") {
    return <p className="text-sm text-[var(--text-secondary)]">Такого участника не нашлось.</p>;
  }
  if (filter.kind !== "choose") return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-[var(--text-secondary)]">Нашлось несколько — выберите:</p>
      <div className="flex flex-wrap gap-2">
        {filter.matches.map((user) => (
          <Link
            key={user.telegram_id}
            href={hrefFor(user)}
            className="glass-subtle glass-interactive inline-flex flex-col rounded-2xl px-3 py-1.5 text-sm"
          >
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-[var(--text-secondary)]">
              {user.email ?? (user.phone && formatPhone(user.phone)) ?? `Telegram ID ${user.telegram_id}`}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
