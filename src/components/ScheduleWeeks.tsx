import type { ReactNode } from "react";
import { formatStudioDay, formatWeekRange, type WeekGroup } from "@/lib/format";

// Длинное расписание (два месяца — ~60 занятий) — по неделям и дням вместо
// сплошного списка. Ближайшие недели раскрыты, дальние свёрнуты в строку
// с числом занятий.
export function ScheduleWeeks<T>({
  weeks,
  renderDay,
  openWeeks = 2,
  forceOpen,
  weekSummary,
}: {
  weeks: WeekGroup<T>[];
  renderDay: (items: T[]) => ReactNode;
  /** Сколько первых недель раскрыто. */
  openWeeks?: number;
  /** Неделя (понедельник), которую раскрыть в любом случае. */
  forceOpen?: string;
  /** Дополнительная строка в заголовке недели. */
  weekSummary?: (week: WeekGroup<T>) => string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {weeks.map((week, index) => (
        <details
          key={week.week}
          open={index < openWeeks || week.week === forceOpen}
          className="schedule-week group flex flex-col"
        >
          <summary className="flex cursor-pointer list-none items-baseline gap-3 py-2 [&::-webkit-details-marker]:hidden">
            <svg
              viewBox="0 0 12 12"
              width="12"
              height="12"
              aria-hidden="true"
              className="shrink-0 self-center text-[var(--text-secondary)] transition-transform group-open:rotate-90"
            >
              <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-heading text-lg font-bold tracking-tight">
              {formatWeekRange(week.week)}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
              {weekSummary ? weekSummary(week) : `занятий: ${week.count}`}
            </span>
          </summary>
          <div className="flex flex-col gap-4 pt-1">
            {week.days.map((day) => (
              <section key={day.day} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                  {formatStudioDay(day.day)}
                </h3>
                {renderDay(day.items)}
              </section>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
