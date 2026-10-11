"use client";

import { useRef, useState, useTransition } from "react";
import { broadcastAction, broadcastRecipientsAction } from "@/lib/adminActions";
import { GLASS_BUTTON_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";

type Option = { value: string; label: string };

const LABEL = "flex flex-col gap-1 text-sm font-medium";

// Форма рассылки: поля только выбранного сегмента, превью сообщения и
// подсчёт получателей без перезагрузки — раньше подсчёт перезагружал
// страницу и набранный текст пропадал.
export function BroadcastForm({
  segments,
  slots,
  classes,
}: {
  segments: Option[];
  slots: Option[];
  classes: Option[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [segment, setSegment] = useState("all");
  const [body, setBody] = useState("");
  const [count, setCount] = useState<{ recipients: number } | { error: string } | null>(null);
  const [counting, startCounting] = useTransition();

  // Любая смена параметров делает старое число неверным.
  const resetCount = () => setCount(null);

  function countRecipients() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    startCounting(async () => setCount(await broadcastRecipientsAction(data)));
  }

  const recipients = count && "recipients" in count ? count.recipients : null;

  return (
    <form
      ref={formRef}
      action={broadcastAction}
      onChange={(event) => {
        if ((event.target as HTMLElement).getAttribute("name") !== "body") resetCount();
      }}
      className="grid gap-5 rounded-[24px] glass-medium p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]"
    >
      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-bold tracking-tight">Новая рассылка</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Сообщение придёт в Telegram-бот и появится в уведомлениях на сайте.
        </p>
        <input type="hidden" name="mode" value="send" />
        <label className={LABEL}>
          Кому
          <select
            name="segment"
            value={segment}
            onChange={(event) => setSegment(event.target.value)}
            className={INPUT_CLASS}
          >
            {segments.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {segment === "with_credits" && (
          <label className={LABEL}>
            Не записывались, дней
            <input type="number" name="inactive_days" min={1} max={365} placeholder="не важно" className={INPUT_CLASS} />
          </label>
        )}
        {segment === "slot" &&
          (slots.length > 0 ? (
            <label className={LABEL}>
              Занятие
              <select name="slot_id" className={INPUT_CLASS}>
                {slots.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">Ближайших занятий нет.</p>
          ))}
        {segment === "direction" && (
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
            <label className={LABEL}>
              Направление
              <select name="class_key" className={INPUT_CLASS}>
                {classes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              За дней
              <input type="number" name="days" min={1} max={365} defaultValue={60} className={INPUT_CLASS} />
            </label>
          </div>
        )}

        <label className={LABEL}>
          Текст
          <textarea
            name="body"
            rows={6}
            maxLength={2000}
            required
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className={INPUT_CLASS}
          />
          <span className="self-end text-xs font-normal text-[var(--text-secondary)]">
            {body.length} / 2000
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={countRecipients}
            disabled={counting}
            className={`${GLASS_BUTTON_CLASS} px-4 py-2 text-sm`}
          >
            {counting ? "Считаем…" : "Посчитать получателей"}
          </button>
          <button
            type="submit"
            disabled={body.trim() === ""}
            onClick={(event) => {
              const who = recipients === null ? "выбранным участникам" : `${recipients} получателям`;
              if (!window.confirm(`Отправить рассылку ${who}? Отменить её будет нельзя.`)) {
                event.preventDefault();
              }
            }}
            className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm disabled:opacity-50`}
          >
            Отправить
          </button>
          {count && (
            <span
              role="status"
              className={`text-sm ${"error" in count ? "text-[var(--danger-text)]" : "text-[var(--text-secondary)]"}`}
            >
              {"error" in count ? count.error : `Получателей: ${count.recipients}`}
            </span>
          )}
        </div>
      </div>

      {/* Превью: так сообщение выглядит в чате с ботом. */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Как увидит участник</span>
        <div className="glass-quiet flex min-h-40 flex-1 items-start rounded-[20px] p-4">
          {body.trim() ? (
            <p className="max-w-full whitespace-pre-line break-words rounded-2xl rounded-bl-md bg-[var(--surface)] px-4 py-2.5 text-sm shadow-sm">
              {body}
            </p>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">Здесь появится текст сообщения.</p>
          )}
        </div>
      </div>
    </form>
  );
}
