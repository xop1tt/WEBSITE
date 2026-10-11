import type { Metadata } from "next";
import {
  getMaintenanceOverview,
  getMaintenancePreview,
  type MaintenanceDetail,
  type MaintenanceDraft,
  type MaintenanceOverview,
  type MaintenanceWindow,
} from "@/lib/admin";
import {
  createMaintenanceAction,
  maintenanceTransitionAction,
  updateMaintenanceAction,
} from "@/lib/adminActions";
import { isServiceFailure } from "@/lib/apiResult";
import { STUDIO_TIMEZONE } from "@/lib/format";
import { GLASS_BUTTON_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { Badge, EmptyState, Notices, formatAdminDateTime } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Обслуживание",
};

type SearchParams = Promise<{ notice?: string; error?: string; preview?: string }>;

const LABEL = "flex flex-col gap-1.5 text-sm font-medium";
const HINT = "text-xs font-normal text-[var(--text-secondary)]";
const CARD = "flex flex-col gap-4 rounded-[24px] glass-medium p-5";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Запланировано",
  active: "Идёт",
  completed: "Завершено",
  cancelled: "Отменено",
};

const KIND_LABELS: Record<string, string> = {
  maintenance_warning: "Предупреждение",
  maintenance_started: "Начало работ",
  maintenance_rescheduled: "Перенос",
  maintenance_cancelled: "Отмена",
  maintenance_completed: "Завершение",
};

const EVENT_LABELS: Record<string, string> = {
  created: "создано",
  updated: "изменены тексты или настройки",
  rescheduled: "изменено время",
  started: "работы начались",
  completed: "работы завершены",
  cancelled: "отменено",
  notifications_queued: "уведомления поставлены в очередь",
  warning_skipped: "предупреждение пропущено (запоздало)",
};

const PRESET_WARNINGS = [
  { minutes: 1440, label: "за 24 часа" },
  { minutes: 60, label: "за 1 час" },
  { minutes: 10, label: "за 10 минут" },
];

function leadLabel(minutes: number): string {
  if (minutes % 1440 === 0) return `за ${minutes / 1440} сут.`;
  if (minutes % 60 === 0) return `за ${minutes / 60} ч`;
  return `за ${minutes} мин`;
}

const DATE_INPUT = new Intl.DateTimeFormat("en-CA", {
  timeZone: STUDIO_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const TIME_INPUT = new Intl.DateTimeFormat("en-GB", {
  timeZone: STUDIO_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Значения полей date/time во времени студии. */
function inputParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const moment = new Date(iso);
  return { date: DATE_INPUT.format(moment), time: TIME_INPUT.format(moment) };
}

function decodeDraft(raw: string | undefined): MaintenanceDraft | null {
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as MaintenanceDraft;
  } catch {
    return null;
  }
}

export default async function AdminMaintenancePage({ searchParams }: { searchParams: SearchParams }) {
  const { notice, error, preview } = await searchParams;
  const overview = await getMaintenanceOverview();
  if (!overview.ok) {
    return isServiceFailure(overview) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  const draft = decodeDraft(preview);
  const previewResult = draft ? await getMaintenancePreview(draft) : null;
  const data = overview.data;
  const current = data.current;

  return (
    <div className="flex flex-col gap-6">
      <Notices notice={notice} error={error} />
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        Пока работы идут, посетители видят страницу технических работ вместо
        сайта (кроме админки и входа). В назначенное время обслуживание
        включается само; выключается — только кнопкой «Завершить работы»,
        даже если плановое окончание прошло. Telegram-бот работает всё время.
        Время — в поясе студии ({STUDIO_TIMEZONE}).
      </p>

      {current ? <CurrentWindow detail={current} overview={data} /> : <MaintenanceFormCard overview={data} draft={draft} />}

      {draft && (
        <section className={CARD} aria-labelledby="maintenance-preview">
          <h2 id="maintenance-preview" className="font-heading text-lg font-bold tracking-tight">
            Предпросмотр (ничего не сохранено и не отправлено)
          </h2>
          {previewResult?.ok ? (
            <>
              <p className="text-sm text-[var(--text-secondary)]">
                Получателей: {previewResult.data.recipients}
                {draft.audience === "staff" ? " (только сотрудники — тестовый режим)" : ""}
              </p>
              <WarningPlan warnings={previewResult.data.warnings} />
              <div className="grid gap-3 md:grid-cols-2">
                {previewResult.data.messages.map((message) => (
                  <figure key={message.kind} className="flex flex-col gap-2 rounded-[20px] glass-subtle p-4">
                    <figcaption className="text-xs font-medium text-[var(--text-secondary)]">
                      {KIND_LABELS[message.kind] ?? message.kind}
                    </figcaption>
                    <p className="whitespace-pre-line text-sm leading-relaxed">{message.text}</p>
                  </figure>
                ))}
              </div>
            </>
          ) : (
            <EmptyState>Не удалось построить предпросмотр — проверьте поля формы.</EmptyState>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold tracking-tight">История</h2>
        {data.history.length === 0 ? (
          <EmptyState>Технических работ ещё не было.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.history.map((item) => (
              <HistoryRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ item }: { item: MaintenanceWindow }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[20px] glass-medium px-4 py-3 text-sm">
      <Badge tone={item.effective_status === "active" ? "danger" : "neutral"}>
        {STATUS_LABELS[item.effective_status]}
      </Badge>
      <span className="font-medium">{item.title}</span>
      <span className="text-[var(--text-secondary)]">
        {formatAdminDateTime(item.starts_at)} — {item.finished_at ? formatAdminDateTime(item.finished_at) : item.ends_at ? `≈ ${formatAdminDateTime(item.ends_at)}` : "окончание неизвестно"}
      </span>
      {item.audience === "staff" && <Badge>тест: только сотрудники</Badge>}
    </li>
  );
}

function WarningPlan({ warnings }: { warnings: MaintenanceDetail["warnings"] }) {
  if (warnings.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">Предупреждения перед началом отключены.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {warnings.map((item) => {
        let state = "ждёт своего времени";
        if (item.recipients !== null && item.skipped_reason === null) {
          state = `поставлено в очередь: ${item.recipients}`;
        } else if (item.skipped_reason || item.state === "late") {
          state = "не будет отправлено — время уже прошло";
        } else if (item.state === "send") {
          state = "отправляется";
        }
        return (
          <li key={item.minutes} className="flex flex-wrap gap-x-2">
            <span className="font-medium">{leadLabel(item.minutes)}</span>
            <span className="text-[var(--text-secondary)]">
              ({formatAdminDateTime(item.due_at)}) — {state}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CurrentWindow({ detail, overview }: { detail: MaintenanceDetail; overview: MaintenanceOverview }) {
  const item = detail.window;
  const active = item.effective_status === "active";
  return (
    <>
      <section className={`${CARD} ${active ? "glass-accent" : ""}`} aria-labelledby="maintenance-current">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={active ? "danger" : "success"}>{STATUS_LABELS[item.effective_status]}</Badge>
          {item.audience === "staff" && <Badge>тестовый режим: уведомления только сотрудникам</Badge>}
          {!item.notify_users && <Badge>без уведомлений в Telegram</Badge>}
        </div>
        <h2 id="maintenance-current" className="font-heading text-2xl font-bold tracking-tight">
          {item.title}
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--text-secondary)]">{active ? "Началось" : "Начало"}</dt>
            <dd className="font-medium">{formatAdminDateTime(item.started_at ?? item.starts_at)}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-secondary)]">Предполагаемое окончание</dt>
            <dd className="font-medium">{item.ends_at ? formatAdminDateTime(item.ends_at) : "неизвестно"}</dd>
          </div>
        </dl>
        {!active && item.notify_users && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Предупреждения участникам</h3>
            <WarningPlan warnings={detail.warnings} />
          </div>
        )}
        <form action={maintenanceTransitionAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={item.id} />
          {active ? (
            <ConfirmSubmitButton
              name="action"
              value="complete"
              confirmMessage="Работы действительно завершены? Сайт сразу вернётся к обычной работе, участникам уйдёт уведомление."
              className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm`}
            >
              Завершить работы
            </ConfirmSubmitButton>
          ) : (
            <>
              <ConfirmSubmitButton
                name="action"
                value="start"
                confirmMessage="Включить обслуживание прямо сейчас? Сайт сразу покажет страницу технических работ."
                className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm`}
              >
                Включить сейчас
              </ConfirmSubmitButton>
              <ConfirmSubmitButton
                name="action"
                value="cancel"
                confirmMessage="Отменить запланированные работы? Предупреждённые участники получат уведомление об отмене."
                className={`${GLASS_BUTTON_CLASS} px-5 py-2 text-sm`}
              >
                Отменить работы
              </ConfirmSubmitButton>
            </>
          )}
        </form>
      </section>

      <MaintenanceFormCard overview={overview} window={item} />

      <section className={CARD} aria-labelledby="maintenance-delivery">
        <h2 id="maintenance-delivery" className="font-heading text-lg font-bold tracking-tight">
          Доставка уведомлений
        </h2>
        {detail.delivery.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Уведомлений по этим работам ещё не было.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {detail.delivery.map((row) => (
              <li key={row.kind} className="flex flex-wrap gap-x-3">
                <span className="font-medium">{KIND_LABELS[row.kind] ?? row.kind}</span>
                <span className="text-[var(--text-secondary)]">
                  отправлено {row.sent} · ожидает {row.pending} · не доставлено {row.failed}
                  {row.skipped ? ` · устарело ${row.skipped}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        <h3 className="text-sm font-semibold">Журнал</h3>
        <ol className="flex flex-col gap-1 text-sm">
          {detail.events.map((event) => (
            <li key={event.id} className="flex flex-wrap gap-x-2">
              <span className="text-[var(--text-secondary)]">{formatAdminDateTime(event.created_at)}</span>
              <span>{EVENT_LABELS[event.event] ?? event.event}</span>
              <span className="text-[var(--text-secondary)]">
                {event.actor_name ?? (event.actor_telegram_id ? `ID ${event.actor_telegram_id}` : "система")}
                {typeof event.details.recipients === "number" ? ` · получателей: ${event.details.recipients}` : ""}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function MaintenanceFormCard({
  overview,
  window,
  draft,
}: {
  overview: MaintenanceOverview;
  window?: MaintenanceWindow;
  draft?: MaintenanceDraft | null;
}) {
  const active = window?.effective_status === "active";
  const source = window ?? draft;
  const starts = inputParts(source?.starts_at ?? null);
  const ends = inputParts(source?.ends_at ?? null);
  const minutes = source?.warning_minutes ?? overview.default_warning_minutes;
  const custom = minutes.filter((value) => !PRESET_WARNINGS.some((preset) => preset.minutes === value));
  const editing = Boolean(window);

  return (
    <section className={CARD} aria-labelledby="maintenance-form">
      <h2 id="maintenance-form" className="font-heading text-lg font-bold tracking-tight">
        {editing ? (active ? "Изменить тексты и окончание" : "Изменить работы") : "Запланировать работы"}
      </h2>
      <form action={editing ? updateMaintenanceAction : createMaintenanceAction} className="flex flex-col gap-4">
        {window && <input type="hidden" name="id" value={window.id} />}
        {window && <input type="hidden" name="phase" value={active ? "active" : "scheduled"} />}
        {/* Исходные значения: время отправляется, только если его изменили
            (иначе сохранение текстов выглядело бы как перенос). */}
        {window && (
          <>
            <input type="hidden" name="orig_starts" value={`${starts.date} ${starts.time}`} />
            <input type="hidden" name="orig_ends" value={`${ends.date} ${ends.time}`} />
          </>
        )}
        <label className={LABEL}>
          Заголовок на странице работ
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={source?.title ?? overview.default_title}
            className={INPUT_CLASS}
          />
        </label>
        <label className={LABEL}>
          Описание
          <textarea
            name="description"
            required
            rows={3}
            maxLength={1000}
            defaultValue={source?.description ?? overview.default_description}
            className={INPUT_CLASS}
          />
        </label>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          {!active && (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className={LABEL}>
                Начало: дата
                <input type="date" name="starts_date" defaultValue={starts.date} className={INPUT_CLASS} />
              </label>
              <label className={LABEL}>
                время
                <input type="time" name="starts_time" defaultValue={starts.time} className={INPUT_CLASS} />
              </label>
            </div>
          )}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className={LABEL}>
              Окончание (примерно): дата
              <input type="date" name="ends_date" defaultValue={ends.date} className={INPUT_CLASS} />
            </label>
            <label className={LABEL}>
              время
              <input type="time" name="ends_time" defaultValue={ends.time} className={INPUT_CLASS} />
            </label>
          </div>
          <p className={`${HINT} sm:col-span-2`}>
            Окончание можно не указывать — тогда на странице не будет обратного
            отсчёта и обещаний по времени.
          </p>
        </fieldset>

        {!active && (
          <fieldset className="flex flex-col gap-3 rounded-[20px] glass-subtle p-4">
            <legend className="px-1 text-sm font-semibold">Уведомления в Telegram</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="notify_users" defaultChecked={source?.notify_users ?? true} />
              Сообщать участникам о работах (начало, перенос, отмена, завершение)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="warnings_enabled" defaultChecked={minutes.length > 0} />
              Предупреждать заранее:
            </label>
            <div className="flex flex-wrap gap-x-4 gap-y-2 pl-6 text-sm">
              {PRESET_WARNINGS.map((preset) => (
                <label key={preset.minutes} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="warning"
                    value={preset.minutes}
                    defaultChecked={minutes.includes(preset.minutes)}
                  />
                  {preset.label}
                </label>
              ))}
            </div>
            <label className={`${LABEL} pl-6`}>
              Другие моменты, минут до начала (через запятую)
              <input
                name="warning_custom"
                inputMode="numeric"
                placeholder="например, 180, 30"
                defaultValue={custom.join(", ")}
                className={INPUT_CLASS}
              />
              <span className={HINT}>
                Предупреждение, время которого уже прошло (например, «за 24 часа» при
                работах через 3 часа), не отправляется.
              </span>
            </label>
            <label className={LABEL}>
              Кому
              <select name="audience" defaultValue={source?.audience ?? "all"} className={INPUT_CLASS}>
                <option value="all">Всем участникам бота ({overview.audience_all})</option>
                <option value="staff">Только сотрудникам — тестовый режим ({overview.audience_staff})</option>
              </select>
            </label>
          </fieldset>
        )}

        <div className="flex flex-wrap gap-2">
          {editing ? (
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm`}>
              Сохранить
            </button>
          ) : (
            <>
              <button type="submit" name="mode" value="preview" className={`${GLASS_BUTTON_CLASS} px-4 py-2 text-sm`}>
                Предпросмотр
              </button>
              <ConfirmSubmitButton
                name="mode"
                value="schedule"
                confirmMessage="Запланировать работы? Участники получат предупреждения в выбранные моменты."
                className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm`}
              >
                Запланировать
              </ConfirmSubmitButton>
              <ConfirmSubmitButton
                name="mode"
                value="start_now"
                confirmMessage="Включить обслуживание прямо сейчас? Сайт сразу покажет страницу технических работ."
                className={`${GLASS_BUTTON_CLASS} px-4 py-2 text-sm`}
              >
                Включить сейчас
              </ConfirmSubmitButton>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
