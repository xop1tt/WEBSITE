import type { Metadata } from "next";
import { getAdminSlots, getBroadcasts } from "@/lib/admin";
import { getClasses } from "@/lib/api";
import { isServiceFailure } from "@/lib/apiResult";
import { BroadcastForm } from "@/components/admin/BroadcastForm";
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
      <BroadcastForm
        segments={Object.entries(SEGMENT_LABELS).map(([value, label]) => ({ value, label }))}
        slots={upcoming.map((slot) => ({
          value: String(slot.id),
          label: `${formatAdminDateTime(slot.starts_at)} — ${slot.class_label} (записано ${slot.booked})`,
        }))}
        classes={(classes.ok ? classes.data : []).map((item) => ({ value: item.key, label: item.label }))}
      />

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
