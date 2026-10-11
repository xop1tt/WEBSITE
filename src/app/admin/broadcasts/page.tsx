import type { Metadata } from "next";
import { getAdminSlots, getBroadcasts } from "@/lib/admin";
import { broadcastAction } from "@/lib/adminActions";
import { getClasses } from "@/lib/api";
import { isServiceFailure } from "@/lib/apiResult";
import { GLASS_BUTTON_CLASS, INPUT_CLASS } from "@/lib/glass";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { EmptyState, Notices, formatAdminDateTime } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Рассылки",
};

type SearchParams = Promise<{ notice?: string; error?: string }>;

const SEGMENT_LABELS: Record<string, string> = {
  all: "все участники",
  with_credits: "с занятиями на балансе",
  slot: "записанные на занятие",
  direction: "ходили на направление",
};

const LABEL = "flex flex-col gap-1 text-sm font-medium";

export default async function AdminBroadcastsPage({ searchParams }: { searchParams: SearchParams }) {
  const { notice, error } = await searchParams;
  const [broadcasts, slots, classes] = await Promise.all([
    getBroadcasts(),
    getAdminSlots(),
    getClasses(),
  ]);
  if (!broadcasts.ok) {
    return isServiceFailure(broadcasts) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  const upcoming = slots.ok ? slots.data.filter((slot) => slot.status !== "cancelled") : [];

  return (
    <div className="flex flex-col gap-6">
      <Notices notice={notice} error={error} />
      <form action={broadcastAction} className="flex flex-col gap-4 rounded-[24px] glass-medium p-5">
        <h2 className="font-heading text-lg font-bold tracking-tight">Новая рассылка</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Сообщение придёт в Telegram-бот и появится в уведомлениях на сайте.
          Параметры учитываются только для выбранного сегмента.
        </p>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <label className={LABEL}>
            Кому
            <select name="segment" defaultValue="all" className={INPUT_CLASS}>
              {Object.entries(SEGMENT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL}>
            «С занятиями на балансе»: без записи, дней
            <input type="number" name="inactive_days" min={1} max={365} placeholder="не важно" className={INPUT_CLASS} />
          </label>
          <label className={LABEL}>
            «Записанные на занятие»: занятие
            <select name="slot_id" className={INPUT_CLASS}>
              {upcoming.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {formatAdminDateTime(slot.starts_at)} — {slot.class_label} ({slot.booked})
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className={LABEL}>
              «Направление»
              <select name="class_key" className={INPUT_CLASS}>
                {(classes.ok ? classes.data : []).map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              за дней
              <input type="number" name="days" min={1} max={365} defaultValue={60} className={INPUT_CLASS} />
            </label>
          </div>
        </fieldset>
        <label className={LABEL}>
          Текст
          <textarea name="body" rows={5} maxLength={2000} className={INPUT_CLASS} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" name="mode" value="preview" className={`${GLASS_BUTTON_CLASS} px-4 py-2 text-sm`}>
            Посчитать получателей
          </button>
          <ConfirmSubmitButton
            name="mode"
            value="send"
            confirmMessage="Отправить рассылку выбранным участникам? Отменить её будет нельзя."
            className="btn-primary rounded-full px-5 py-2 text-sm font-medium"
          >
            Отправить
          </ConfirmSubmitButton>
        </div>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold tracking-tight">Отправленные</h2>
        {broadcasts.data.length === 0 ? (
          <EmptyState>Рассылок пока не было.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {broadcasts.data.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 rounded-[24px] glass-medium p-4 text-sm">
                <div className="flex flex-wrap gap-x-3 text-[var(--text-secondary)]">
                  <span>{formatAdminDateTime(item.created_at)}</span>
                  <span>{item.author_name ?? "—"}</span>
                  <span>{SEGMENT_LABELS[item.segment] ?? item.segment}</span>
                  <span>
                    получателей {item.recipients} · доставлено {item.sent}
                    {item.failed ? ` · не доставлено ${item.failed}` : ""}
                  </span>
                </div>
                <p className="whitespace-pre-line">{item.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
