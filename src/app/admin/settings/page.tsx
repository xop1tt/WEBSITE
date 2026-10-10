import type { Metadata } from "next";
import { getStudioRules } from "@/lib/admin";
import { studioRulesAction } from "@/lib/adminActions";
import { isServiceFailure } from "@/lib/apiResult";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { EmptyState, Notices } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Настройки",
};

type SearchParams = Promise<{ notice?: string; error?: string }>;

export default async function AdminSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { notice, error } = await searchParams;
  const rules = await getStudioRules();
  if (!rules.ok) {
    return isServiceFailure(rules) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Notices notice={notice} error={error} />
      <section className="flex flex-col gap-4 rounded-[24px] glass-medium p-5">
        <h2 className="font-heading text-lg font-bold tracking-tight">Правила записи</h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Новые значения действуют сразу для всех записей и отмен — и в боте, и
          на сайте. Если студия перенесла занятие, записанные могут отменить его
          до нового начала независимо от окна отмены.
        </p>
        <form action={studioRulesAction} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Отмена записи — не позднее чем за, часов
            <input
              type="number"
              name="cancellation_deadline_hours"
              min={0}
              max={168}
              required
              defaultValue={rules.data.cancellation_deadline_hours}
              className={INPUT_CLASS}
            />
            <span className="text-xs font-normal text-[var(--text-secondary)]">
              0 — отменить можно до самого начала занятия
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Повторная запись после своей отмены — через, часов
            <input
              type="number"
              name="rebook_cooldown_hours"
              min={0}
              max={168}
              required
              defaultValue={rules.data.rebook_cooldown_hours}
              className={INPUT_CLASS}
            />
            <span className="text-xs font-normal text-[var(--text-secondary)]">
              Защита от записи и отмены «туда-обратно»; 0 — без паузы
            </span>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm`}>
              Сохранить
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
