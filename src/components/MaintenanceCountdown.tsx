"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NO_END_MESSAGE, countdown, type Countdown } from "@/lib/maintenance";
import { plural } from "@/lib/format";

// Как часто страница обслуживания перепроверяет состояние: router.refresh()
// запрашивает текущий адрес заново, и когда работы завершены, proxy отдаёт
// обычную страницу — посетитель возвращается на сайт без перезагрузки.
const REFRESH_MS = 60_000;

const UNITS: [keyof Countdown, [string, string, string]][] = [
  ["days", ["день", "дня", "дней"]],
  ["hours", ["час", "часа", "часов"]],
  ["minutes", ["минута", "минуты", "минут"]],
  ["seconds", ["секунда", "секунды", "секунд"]],
];

/**
 * Обратный отсчёт до предполагаемого окончания работ. Оставшееся время
 * каждый раз вычисляется от реальных часов (Date.now() с поправкой на
 * часы сервера), а не уменьшается счётчиком: вкладка в фоне или
 * переведённые часы не сбивают его. Окончание неизвестно или прошло —
 * нейтральный текст вместо отрицательных чисел.
 */
export function MaintenanceCountdown({
  endsAt,
  endsAtLabel,
  serverTime,
}: {
  endsAt: string | null;
  // «Вт 13.10 · 04:00» — уже в поясе студии (форматирует сервер).
  endsAtLabel: string | null;
  serverTime: string;
}) {
  const router = useRouter();
  // Первый рендер (сервер и гидратация) — по времени сервера, без
  // расхождения разметки; дальше — по часам браузера с поправкой.
  const [now, setNow] = useState(() => Date.parse(serverTime));

  useEffect(() => {
    const skew = Date.parse(serverTime) - Date.now();
    const tick = () => setNow(Date.now() + skew);
    tick();
    const timer = window.setInterval(tick, 1000);
    const refresh = window.setInterval(() => router.refresh(), REFRESH_MS);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(refresh);
    };
  }, [router, serverTime]);

  const left = countdown(endsAt, now);
  if (!left) {
    // Окончание неизвестно или уже прошло: без чисел и без обещаний.
    return (
      <>
        <h2 id="maintenance-eta" className="eyebrow">
          Когда вернёмся
        </h2>
        <p className="text-lg leading-relaxed text-[var(--text-secondary)]">{NO_END_MESSAGE}</p>
      </>
    );
  }

  const visible = UNITS.filter(([unit]) => unit !== "days" || left.days > 0);
  return (
    <>
      <h2 id="maintenance-eta" className="eyebrow">
        До завершения
      </h2>
      {/* Тикающие цифры не зачитываются скринридером каждую секунду. */}
      <div role="timer" aria-live="off" className="flex flex-wrap gap-2 sm:gap-3">
        {visible.map(([unit, forms]) => (
          <div
            key={unit}
            className="glass-subtle flex min-w-[4.25rem] flex-col items-center rounded-[20px] px-3 py-2.5 sm:min-w-[5rem]"
          >
            <span className="font-heading text-3xl font-bold tabular-nums tracking-tight text-[var(--primary-text)] sm:text-4xl">
              {String(left[unit]).padStart(unit === "days" ? 1 : 2, "0")}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">{plural(left[unit], forms)}</span>
          </div>
        ))}
      </div>
      {endsAtLabel && (
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Предполагаемое завершение — {endsAtLabel} по времени студии. Время
          предварительное: работы могут закончиться раньше или немного позже.
        </p>
      )}
    </>
  );
}

/** «Проверить снова»: тот же адрес заново — если работы закончились, откроется сайт. */
export function MaintenanceRetryButton({ className }: { className: string }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.refresh()} className={className}>
      Проверить снова
    </button>
  );
}
