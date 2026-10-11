import type { ReactNode } from "react";
import { formatStudioDay, type DayGroup } from "@/lib/format";

// Расписание по датам: каждая дата — раскрывающийся список занятий этого
// дня (свёрнут, пока не нажать; раскрыт только день из `openDay`).
export function ScheduleDays<T>({
  days,
  renderDay,
  openDay,
}: {
  days: DayGroup<T>[];
  renderDay: (items: T[]) => ReactNode;
  /** День (YYYY-MM-DD), который раскрыть сразу, например после записи. */
  openDay?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => (
        <details
          key={day.day}
          open={day.day === openDay}
          className="schedule-day glass-medium group rounded-[24px]"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="font-heading text-lg font-bold tracking-tight">
              {formatStudioDay(day.day)}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">занятий: {day.items.length}</span>
            <svg
              viewBox="0 0 12 12"
              width="14"
              height="14"
              aria-hidden="true"
              className="ml-auto shrink-0 text-[var(--text-secondary)] transition-transform group-open:rotate-90"
            >
              <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">{renderDay(day.items)}</div>
        </details>
      ))}
    </div>
  );
}
