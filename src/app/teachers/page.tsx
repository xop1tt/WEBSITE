import type { Metadata } from "next";
import Link from "next/link";
import { PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { TEACHERS, type Teacher } from "@/lib/teachers";

export const metadata: Metadata = {
  title: "Преподаватели",
};

// МАКЕТ: данные вымышленные (lib/teachers.ts), фото — заглушки с инициалами.
export default function TeachersPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">Преподаватели</h1>
        <p className="glass-subtle w-fit max-w-2xl rounded-2xl px-4 py-2.5 text-sm text-[var(--text-secondary)]">
          🚧 Страница ещё в разработке, а наши преподаватели пока выдуманные —
          настоящие уже репетируют, чтобы появиться во всей красе.
        </p>
        <p className="max-w-2xl text-lg text-[var(--text-secondary)]">
          Те, кто встретит вас на первом занятии и поможет почувствовать ритм —
          внимательно, по-доброму и без спешки.
        </p>
      </div>

      <ul className="grid gap-6 md:grid-cols-2">
        {TEACHERS.map((teacher) => (
          <li key={teacher.id}>
            <TeacherCard teacher={teacher} />
          </li>
        ))}
      </ul>

      <div className="glass-subtle flex flex-col items-start justify-between gap-4 rounded-[28px] p-6 sm:flex-row sm:items-center sm:p-7">
        <p className="max-w-xl text-[var(--text-secondary)]">
          Не знаете, к кому пойти? Выберите занятие в расписании — в любой
          группе вам будут рады.
        </p>
        <Link href="/schedule" className={`${PRIMARY_BUTTON_CLASS} shrink-0 px-6 py-3 text-base`}>
          Посмотреть занятия
        </Link>
      </div>
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  const initials = teacher.name
    .split(" ")
    .map((part) => part[0])
    .join("");
  return (
    <article className="glass-medium flex h-full flex-col overflow-hidden rounded-[28px]">
      {/* Заглушка вместо фото: градиент и инициалы. */}
      <div
        className="relative flex aspect-[16/10] items-center justify-center"
        style={{
          background: `radial-gradient(120% 120% at 25% 15%, hsl(${teacher.hue} 70% 55% / 0.85), hsl(${teacher.hue} 55% 22%) 70%)`,
        }}
        role="img"
        aria-label={`Фото: ${teacher.name} (заглушка)`}
      >
        <span className="font-heading text-6xl font-bold tracking-wide text-white/90 drop-shadow">
          {initials}
        </span>
        <span className="absolute bottom-3 left-3 rounded-full bg-black/35 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
          {teacher.experience}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">{teacher.name}</h2>
          <p className="text-sm font-medium text-[var(--primary-text)]">{teacher.role}</p>
        </div>
        <p className="leading-relaxed text-[var(--text-secondary)]">{teacher.bio}</p>
        <blockquote className="border-l-2 border-[var(--primary)] pl-4 text-[15px] italic text-[var(--text-primary)]">
          «{teacher.quote}»
        </blockquote>
        <ul className="mt-auto flex flex-wrap gap-2 pt-1">
          {teacher.directions.map((direction) => (
            <li
              key={direction}
              className="glass-subtle rounded-full px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
            >
              {direction}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
