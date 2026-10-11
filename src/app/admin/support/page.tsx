import type { Metadata } from "next";
import Link from "next/link";
import { getAdminTickets } from "@/lib/admin";
import { isServiceFailure } from "@/lib/apiResult";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { EmptyState, Notices, SubTabs, formatAdminDateTime } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Поддержка",
};

type SearchParams = Promise<{ status?: string; notice?: string; error?: string }>;

export default async function AdminSupportPage({ searchParams }: { searchParams: SearchParams }) {
  const { status: rawStatus, notice, error } = await searchParams;
  const status = rawStatus === "closed" ? "closed" : "open";
  const result = await getAdminTickets(status);

  return (
    <div className="flex flex-col gap-4">
      <Notices notice={notice} error={error} />
      <SubTabs
        tabs={[
          { href: "/admin/support", label: "Открытые", active: status === "open" },
          { href: "/admin/support?status=closed", label: "Закрытые", active: status === "closed" },
        ]}
      />

      {!result.ok ? (
        isServiceFailure(result) ? (
          <ServiceUnavailableNotice />
        ) : (
          <EmptyState>Нет доступа.</EmptyState>
        )
      ) : result.data.length === 0 ? (
        <EmptyState>
          {status === "open" ? "Открытых обращений нет." : "Закрытых обращений нет."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.data.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/admin/support/${ticket.id}`}
                className="glass-interactive flex flex-col gap-1 rounded-[24px] glass-medium p-5"
              >
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">№{ticket.id}</span>
                  <span>{ticket.user_name ?? ticket.telegram_id}</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {formatAdminDateTime(ticket.updated_at)}
                  </span>
                </span>
                <span className="line-clamp-2 text-sm text-[var(--text-secondary)]">
                  {ticket.last_message || "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
