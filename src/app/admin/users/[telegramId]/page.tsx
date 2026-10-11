import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import {
  getAdminClient,
  getAdminClientBookings,
  getAdminClientTickets,
  getAdminLedger,
  getAdminPayments,
  getAdminSlots,
  getClientNotes,
  type AdminClientCard,
} from "@/lib/admin";
import {
  addNoteAction,
  adjustCreditsAction,
  adminBookAction,
  deleteNoteAction,
  adminCancelBookingAction,
  clientProfileAction,
  grantPackageAction,
  revokeGrantAction,
} from "@/lib/adminActions";
import { getPackages } from "@/lib/api";
import { isServiceFailure } from "@/lib/apiResult";
import { lessonsCount } from "@/lib/format";
import { GLASS_BUTTON_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { PaymentActions } from "@/components/admin/PaymentActions";
import {
  Badge,
  EmptyState,
  Notices,
  formatAdminDateTime,
  formatRub,
} from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Участник",
};

type Params = Promise<{ telegramId: string }>;
type SearchParams = Promise<{ notice?: string; error?: string; offset?: string }>;

const SECTION = "flex flex-col gap-3 rounded-[24px] glass-medium p-5";
const H2 = "font-heading text-lg font-bold tracking-tight";

export default async function AdminClientPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { telegramId: raw } = await params;
  const { notice, error, offset: rawOffset } = await searchParams;
  const telegramId = Number(raw);
  if (!Number.isInteger(telegramId) || telegramId <= 0) {
    notFound();
  }
  const offset = Math.max(0, Number(rawOffset) || 0);
  const [card, bookings, payments, ledger, tickets, catalog, slots, notes] = await Promise.all([
    getAdminClient(telegramId),
    getAdminClientBookings(telegramId, offset),
    getAdminPayments({ telegram_id: telegramId, limit: 20 }),
    getAdminLedger({ telegram_id: telegramId }),
    getAdminClientTickets(telegramId),
    getPackages(),
    getAdminSlots(),
    getClientNotes(telegramId),
  ]);
  const upcomingIds = new Set(card.ok ? card.data.upcoming.map((b) => b.slot_id) : []);
  // Куда можно записать: открытые занятия со свободными местами, на
  // которые участник ещё не записан (backend проверит всё сам).
  const openSlots = slots.ok
    ? slots.data.filter(
        (slot) => slot.status === "open" && slot.remaining > 0 && !upcomingIds.has(slot.id),
      )
    : [];
  if (!card.ok) {
    if (card.status === 404) notFound();
    return isServiceFailure(card) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  const client = card.data;
  const path = `/admin/users/${telegramId}`;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/users" className="text-sm text-[var(--primary-text)] underline-offset-4 hover:underline">
        ← Все участники
      </Link>
      <Notices notice={notice} error={error} />

      <Header client={client} />

      <section className={SECTION}>
        <h2 className={H2}>Заметки</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Служебные: участник их не видит; последнюю заметку видит преподаватель
          в списке участников своего занятия.
        </p>
        {notes.ok && notes.data.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm">
            {notes.data.map((note) => (
              <li key={note.id} className="flex flex-wrap items-start gap-x-3">
                <span className="whitespace-pre-line">{note.body}</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {note.author_name ?? "—"} · {formatAdminDateTime(note.created_at)}
                </span>
                <form action={deleteNoteAction}>
                  <input type="hidden" name="telegram_id" value={telegramId} />
                  <input type="hidden" name="note_id" value={note.id} />
                  <ConfirmSubmitButton confirmMessage="Удалить заметку?" className="text-xs text-[var(--danger-text)]">
                    удалить
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addNoteAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="telegram_id" value={telegramId} />
          <textarea name="body" required maxLength={1000} rows={2} placeholder="уровень, ограничения, договорённости" className={`${INPUT_CLASS} min-w-72 flex-1`} />
          <button type="submit" className={`${GLASS_BUTTON_CLASS} px-4 py-2 text-sm`}>
            Добавить
          </button>
        </form>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Запись на занятия</h2>
        {client.upcoming.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm">
            {client.upcoming.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{formatAdminDateTime(booking.starts_at)}</span>
                <span className="font-medium">{booking.class_label}</span>
                <form action={adminCancelBookingAction}>
                  <input type="hidden" name="telegram_id" value={telegramId} />
                  <input type="hidden" name="slot_id" value={booking.slot_id} />
                  <ConfirmSubmitButton
                    confirmMessage="Отменить запись? Занятие вернётся на баланс даже позже окна отмены; участник получит уведомление."
                    className={`${GLASS_BUTTON_CLASS} px-3 py-1 text-xs`}
                  >
                    Отменить запись
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={adminBookAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="telegram_id" value={telegramId} />
          <label className="flex flex-col gap-1 text-sm font-medium">
            Записать на занятие
            <select name="slot_id" required className={`${INPUT_CLASS} min-w-64`}>
              {openSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {formatAdminDateTime(slot.starts_at)} — {slot.class_label} (мест: {slot.remaining})
                </option>
              ))}
            </select>
          </label>
          <ConfirmSubmitButton
            confirmMessage="Записать участника? С баланса спишется 1 занятие, участник получит уведомление."
            className={`${PRIMARY_BUTTON_CLASS} px-4 py-2 text-sm`}
          >
            Записать
          </ConfirmSubmitButton>
        </form>
        <p className="text-xs text-[var(--text-secondary)]">
          Те же правила, что при самозаписи: нужны свободное место и занятие на
          балансе; закрытая запись и пауза после своей отмены не обходятся.
        </p>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Абонементы</h2>
        <PackagesList client={client} />
        <div className="grid gap-4 border-t border-[var(--border)] pt-4 lg:grid-cols-2">
          <form action={grantPackageAction} className="flex flex-col gap-2">
            <input type="hidden" name="telegram_id" value={telegramId} />
            <input type="hidden" name="idempotence_key" value={randomUUID()} />
            <span className="text-sm font-medium">Выдать абонемент (без онлайн-оплаты)</span>
            <select name="package_key" required className={INPUT_CLASS}>
              {(catalog.ok ? catalog.data : []).map((item) => (
                <option key={item.key} value={item.key}>
                  {item.title} — {lessonsCount(item.lessons)}
                </option>
              ))}
            </select>
            <input
              name="reason"
              required
              maxLength={300}
              placeholder="причина, например «оплата наличными» — увидит участник"
              className={INPUT_CLASS}
            />
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} self-start px-4 py-2 text-sm`}>
              Выдать
            </button>
          </form>
          <form action={adjustCreditsAction} className="flex flex-col gap-2">
            <input type="hidden" name="telegram_id" value={telegramId} />
            <input type="hidden" name="idempotence_key" value={randomUUID()} />
            <span className="text-sm font-medium">Корректировка баланса</span>
            <div className="flex gap-2">
              <select name="sign" className={`${INPUT_CLASS} w-24`}>
                <option value="+">+</option>
                <option value="-">−</option>
              </select>
              <input type="number" name="amount" min={1} max={100} required defaultValue={1} className={`${INPUT_CLASS} w-24`} />
            </div>
            <input
              name="reason"
              required
              maxLength={300}
              placeholder="причина — увидит участник"
              className={INPUT_CLASS}
            />
            <span className="text-xs text-[var(--text-secondary)]">
              Начисление действует «Срок ручных начислений» из настроек; списание
              не уводит баланс ниже нуля.
            </span>
            <button type="submit" className={`${GLASS_BUTTON_CLASS} self-start px-4 py-2 text-sm`}>
              Применить
            </button>
          </form>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Профиль</h2>
        <form action={clientProfileAction} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="telegram_id" value={telegramId} />
          <label className="flex flex-col gap-1 text-sm font-medium">
            Имя
            <input name="user_name" maxLength={64} defaultValue={client.profile.user_name} className={INPUT_CLASS} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Телефон
            <input name="phone" maxLength={32} defaultValue={client.profile.phone ?? ""} className={INPUT_CLASS} />
          </label>
          <div className="flex items-end">
            <button type="submit" className={`${GLASS_BUTTON_CLASS} px-4 py-2 text-sm`}>
              Сохранить
            </button>
          </div>
        </form>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Занятия</h2>
        {!bookings.ok || bookings.data.items.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Записей нет.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {bookings.data.items.map((booking) => (
              <li key={booking.id} className="flex flex-wrap gap-x-3">
                <span>{formatAdminDateTime(booking.starts_at)}</span>
                <span className="font-medium">{booking.class_label}</span>
                <Badge>{booking.status_label}</Badge>
                {booking.slot_cancel_reason && (
                  <span className="text-[var(--text-secondary)]">{booking.slot_cancel_reason}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          {offset > 0 && (
            <Link href={`${path}?offset=${Math.max(0, offset - 20)}`} className={`${GLASS_BUTTON_CLASS} px-3 py-1 text-xs`}>
              ← Новее
            </Link>
          )}
          {bookings.ok && bookings.data.next_offset !== null && (
            <Link href={`${path}?offset=${bookings.data.next_offset}`} className={`${GLASS_BUTTON_CLASS} px-3 py-1 text-xs`}>
              Старше →
            </Link>
          )}
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Покупки</h2>
        {!payments.ok || payments.data.items.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Покупок нет.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-sm">
            {payments.data.items.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[var(--text-secondary)]">№{payment.id}</span>
                <span>{formatAdminDateTime(payment.created_at)}</span>
                <span className="font-medium">{payment.package_title}</span>
                <span>{formatRub(payment.amount_rub)}</span>
                <Badge>{payment.status_label}</Badge>
                <PaymentActions payment={payment} returnTo={path} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Операции с балансом</h2>
        {!ledger.ok || ledger.data.items.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Операций нет.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {ledger.data.items.map((item) => (
              <li key={item.id} className="flex flex-wrap gap-x-3">
                <span className="text-[var(--text-secondary)]">{formatAdminDateTime(item.created_at)}</span>
                <span className={item.delta > 0 ? "text-[var(--success-text)]" : ""}>
                  {item.delta > 0 ? `+${item.delta}` : item.delta}
                </span>
                <span>{item.label}</span>
                {item.package_title && <span className="text-[var(--text-secondary)]">«{item.package_title}»</span>}
                {item.class_label && <span className="text-[var(--text-secondary)]">{item.class_label}</span>}
                {item.reason && <span className="text-[var(--text-secondary)]">— {item.reason}</span>}
              </li>
            ))}
          </ul>
        )}
        <Link href={`/admin/finance?telegram_id=${telegramId}`} className="text-sm text-[var(--primary-text)] underline-offset-4 hover:underline">
          Вся история в «Финансах» →
        </Link>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Обращения</h2>
        {!tickets.ok || tickets.data.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Обращений нет.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {tickets.data.map((ticket) => (
              <li key={ticket.id}>
                <Link href={`/admin/support/${ticket.id}`} className="text-[var(--primary-text)] underline-offset-4 hover:underline">
                  №{ticket.id}
                </Link>{" "}
                · {ticket.status === "open" ? "открыто" : "закрыто"} · {ticket.last_message.slice(0, 120)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Header({ client }: { client: AdminClientCard }) {
  const { profile } = client;
  return (
    <section className={SECTION}>
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="font-heading text-2xl font-bold tracking-tight">{profile.user_name}</h2>
        {client.role === "admin" && <Badge tone="success">администратор</Badge>}
        {client.role === "teacher" && <Badge tone="success">преподаватель</Badge>}
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div>Telegram ID: {profile.telegram_id}</div>
        <div>Телефон: {profile.phone ?? "не указан"}</div>
        <div>Сайт: {client.email ?? (client.has_web_account ? "вход через Telegram" : "нет аккаунта")}</div>
        <div>В студии с {formatAdminDateTime(profile.registered_at)}</div>
      </dl>
      <p className="text-2xl font-bold text-[var(--primary-text)]">{lessonsCount(client.packages.balance)}</p>
      {client.upcoming.length > 0 && (
        <div className="text-sm">
          <span className="font-medium">Ближайшие занятия:</span>
          <ul>
            {client.upcoming.map((booking) => (
              <li key={booking.id}>
                {formatAdminDateTime(booking.starts_at)} — {booking.class_label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PackagesList({ client }: { client: AdminClientCard }) {
  const { packages } = client;
  if (packages.packages.length === 0 && packages.unallocated === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">Абонементов нет.</p>;
  }
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {packages.packages.map((item) => (
        <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium">{item.title}</span>
          {item.kind === "grant" && <Badge>от студии</Badge>}
          <span className="text-[var(--text-secondary)]">
            {item.status === "active" ? `осталось ${item.remaining} из ${item.lessons}` : item.status_label}
          </span>
          {item.expires_at && item.status === "active" && (
            <span className="text-[var(--text-secondary)]">до {formatAdminDateTime(item.expires_at)}</span>
          )}
          {item.kind === "grant" && item.status === "active" && (
            <form action={revokeGrantAction} className="flex items-center gap-1">
              <input type="hidden" name="telegram_id" value={client.profile.telegram_id} />
              <input type="hidden" name="grant_id" value={item.id} />
              <input name="reason" required maxLength={300} placeholder="причина отзыва" className={`${INPUT_CLASS} w-40 py-1 text-xs`} />
              <ConfirmSubmitButton
                confirmMessage={`Отозвать «${item.title}»? Спишутся неиспользованные занятия (${item.remaining}).`}
                className="rounded-full bg-[var(--danger-bg)] px-3 py-1 text-xs font-medium text-[var(--danger-text)]"
              >
                Отозвать
              </ConfirmSubmitButton>
            </form>
          )}
        </li>
      ))}
      {packages.unallocated > 0 && (
        <li className="text-[var(--text-secondary)]">Бессрочно: {lessonsCount(packages.unallocated)}</li>
      )}
    </ul>
  );
}
