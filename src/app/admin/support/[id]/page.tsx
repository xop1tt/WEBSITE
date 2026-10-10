import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminThread } from "@/lib/admin";
import { supportCloseAction, supportReopenAction, supportReplyAction } from "@/lib/adminActions";
import { isServiceFailure } from "@/lib/apiResult";
import { GLASS_BUTTON_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { Badge, EmptyState, Notices, formatAdminDateTime } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Обращение",
};

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ notice?: string; error?: string }>;

export default async function AdminTicketPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { notice, error } = await searchParams;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    notFound();
  }
  const result = await getAdminThread(ticketId);
  if (!result.ok) {
    if (result.status === 404) notFound();
    return isServiceFailure(result) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  const thread = result.data;
  const isOpen = thread.status === "open";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/support"
        className="self-start text-sm font-medium text-[var(--primary-text)] underline-offset-4 hover:underline"
      >
        ← Все обращения
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-2xl font-bold tracking-tight">Обращение №{thread.id}</h2>
        <Badge tone={isOpen ? "success" : "neutral"}>{isOpen ? "открыто" : "закрыто"}</Badge>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {thread.user_name ?? "Участник"} · Telegram {thread.telegram_id} · создано{" "}
        {formatAdminDateTime(thread.created_at)}
      </p>
      <Notices notice={notice} error={error} />

      <ol className="flex flex-col gap-3">
        {thread.messages.map((message) => (
          <li
            key={message.id}
            className={`flex max-w-[85%] flex-col gap-1 rounded-[20px] p-4 ${
              message.sender_role === "admin" ? "glass-accent self-end glass-medium" : "glass-medium self-start"
            }`}
          >
            <span className="text-xs text-[var(--text-secondary)]">
              {message.sender_role === "admin" ? "Студия" : (thread.user_name ?? "Участник")} ·{" "}
              {formatAdminDateTime(message.created_at)}
            </span>
            <span className="whitespace-pre-wrap text-sm">{message.body}</span>
          </li>
        ))}
      </ol>

      {isOpen && (
        <div className="flex flex-col gap-3 rounded-[24px] glass-medium p-5">
          <form action={supportReplyAction} className="flex flex-col gap-3">
            <input type="hidden" name="ticket_id" value={thread.id} />
            <label htmlFor="reply" className="text-sm font-medium">
              Ответ (придёт участнику в Telegram)
            </label>
            <textarea
              id="reply"
              name="body"
              required
              maxLength={2000}
              rows={4}
              className={INPUT_CLASS}
            />
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} self-start px-5 py-2 text-sm`}>
              Отправить ответ
            </button>
          </form>
          <form action={supportCloseAction}>
            <input type="hidden" name="ticket_id" value={thread.id} />
            <ConfirmSubmitButton
              confirmMessage="Закрыть обращение? Участник получит уведомление."
              className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm`}
            >
              Закрыть обращение
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
      {!isOpen && (
        <form action={supportReopenAction}>
          <input type="hidden" name="ticket_id" value={thread.id} />
          <button type="submit" className={`${GLASS_BUTTON_CLASS} px-4 py-1.5 text-sm`}>
            Открыть снова
          </button>
        </form>
      )}
    </div>
  );
}
