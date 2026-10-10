import type { AdminPayment } from "@/lib/admin";
import { paymentAction } from "@/lib/adminActions";
import { GLASS_BUTTON_CLASS, INPUT_CLASS } from "@/lib/glass";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

/** Действия с платежом: возврат успешной оплаты, сверка возврата и оплаты. */
export function PaymentActions({ payment, returnTo }: { payment: AdminPayment; returnTo: string }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {payment.status === "succeeded" && (
        <form action={paymentAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="payment_id" value={payment.id} />
          <input type="hidden" name="action" value="refund" />
          <input type="hidden" name="return_to" value={returnTo} />
          <input
            name="reason"
            maxLength={300}
            placeholder="причина возврата"
            className={`${INPUT_CLASS} w-44 py-1 text-xs`}
          />
          <ConfirmSubmitButton
            confirmMessage={`Вернуть оплату №${payment.id}? Возможен только если все занятия этого абонемента не использованы; занятия спишутся с баланса.`}
            className="rounded-full bg-[var(--danger-bg)] px-3 py-1 text-xs font-medium text-[var(--danger-text)]"
          >
            Возврат
          </ConfirmSubmitButton>
        </form>
      )}
      {payment.status === "refund_pending" && (
        <SimpleAction payment={payment} action="refund-check" label="Сверить возврат" returnTo={returnTo} />
      )}
      {payment.status === "pending" && (
        <SimpleAction payment={payment} action="check" label="Сверить с ЮKassa" returnTo={returnTo} />
      )}
    </div>
  );
}

function SimpleAction({
  payment,
  action,
  label,
  returnTo,
}: {
  payment: AdminPayment;
  action: string;
  label: string;
  returnTo: string;
}) {
  return (
    <form action={paymentAction}>
      <input type="hidden" name="payment_id" value={payment.id} />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="return_to" value={returnTo} />
      <button type="submit" className={`${GLASS_BUTTON_CLASS} px-3 py-1 text-xs`}>
        {label}
      </button>
    </form>
  );
}
