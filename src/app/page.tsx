import Link from "next/link";
import type { ReactNode } from "react";
import { getBookingRules, getSchedule, isBookable } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getMyBookedSlotIds, getMyRebookTimes, getMyWaitlistedSlotIds } from "@/lib/account";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { getDirections } from "@/lib/directions";
import { formatClassDateTime } from "@/lib/format";
import { GLASS_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { BookableScheduleList } from "@/components/BookableScheduleList";
import { DirectionsStackCarousel } from "@/components/DirectionsStackCarousel";
import { HomeStory } from "@/components/HomeStory";
import { HomeStage } from "@/components/home/HomeStage";

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

// Расписание и абонементы меняются (места заполняются, цены может менять
// студия), поэтому страницу нельзя кэшировать статически на этапе сборки —
// см. README.md.
export const dynamic = "force-dynamic";

const WHY_US = [
  {
    icon: "group" as const,
    text: "Небольшие группы и внимание к технике каждого ученика.",
  },
  {
    icon: "levels" as const,
    text: "Занятия для любого уровня — от первого шага до постановки номера.",
  },
  {
    icon: "calendar" as const,
    text: "Гибкое расписание и возможность индивидуальных занятий.",
  },
];

// Главная — обычная страница из секций (HomeStory). Фон-сцена с веером и
// кастаньетами лежит позади hero; с началом прокрутки реквизит улетает
// вверх и возвращается, когда листают обратно к hero.
export default async function HomePage() {
  const [scheduleResult, directions, currentUser, rules] = await Promise.all([
    getSchedule(),
    getDirections(),
    getCurrentUser(),
    getBookingRules(),
  ]);
  // Как в разделе «Записаться» бота: только занятия, на которые можно
  // записаться.
  const [bookedSlotIds, waitlistedSlotIds, rebookTimes] = currentUser?.telegram_id
    ? await Promise.all([getMyBookedSlotIds(), getMyWaitlistedSlotIds(), getMyRebookTimes()])
    : [undefined, undefined, undefined];
  const allSlots = scheduleResult.ok ? scheduleResult.data : [];
  const schedule = allSlots.filter(isBookable);
  const upcoming = schedule.slice(0, 4);
  const nextClass = schedule[0];
  // Пока расписание пустое, вести главный CTA в расписание некуда —
  // ведём туда, где можно реально оставить заявку (см. аудит, пункт 3.2).
  const heroCtaHref = schedule.length > 0 ? "/schedule" : "/contact";
  const heroCtaLabel =
    schedule.length > 0 ? "Записаться на занятие" : "Оставить заявку";

  return (
    <HomeStory stage={<HomeStage />}>
      <Scene id="hero" dark labelledBy="hero-title">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
          <div className="stage-copy flex max-w-xl flex-col items-start gap-4 text-left">
            <div className="flex flex-col items-start gap-3">
              <span className="eyebrow">Студия фламенко</span>
              <h1
                id="hero-title"
                className="font-heading text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
              >
                Mirada Studio
              </h1>
            </div>
            <p className="text-lg leading-relaxed text-[var(--text-secondary)] sm:text-xl"
            >
              Танец фламенко для начинающих и продолжающих: живой ритм,
              работа с телом и характером — в группе или индивидуально.
            </p>
            <div className="mt-1 flex flex-wrap gap-3 [text-shadow:none]">
              <Link href={heroCtaHref} className={`${PRIMARY_BUTTON_CLASS} px-7 py-3.5 text-base`}>
                {heroCtaLabel}
              </Link>
              {TELEGRAM_BOT_USERNAME && (
                <a
                  href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${GLASS_BUTTON_CLASS} glass-float px-7 py-3.5 text-base font-semibold`}
                >
                  Написать в Telegram
                </a>
              )}
            </div>
            {nextClass && (
              <Link
                href="/schedule"
                className="glass-subtle glass-float glass-interactive mt-2 inline-flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm [text-shadow:none]"
              >
                <span
                  className={`availability-dot ${isBookable(nextClass) ? "availability-dot--free" : "availability-dot--full"}`}
                  role="img"
                  aria-label={isBookable(nextClass) ? "Есть свободные места" : "Мест нет"}
                />
                <span className="flex flex-col">
                  <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Ближайшее занятие
                  </span>
                  <span className="font-medium">
                    {nextClass.class_label} · {formatClassDateTime(nextClass.starts_at)}
                  </span>
                </span>
              </Link>
            )}
          </div>
        </div>
        <div className="scroll-hint glass-subtle glass-float">
          <span className="scroll-hint__inner">
            <span>Листайте</span>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" />
            </svg>
          </span>
        </div>
      </Scene>

      <Scene id="directions" labelledBy="directions-title">
        <div className="mx-auto w-full max-w-5xl px-4">
          <div className="mb-4 flex flex-col items-center gap-3 text-center">
            <span className="eyebrow">Наши направления</span>
            <h2 id="directions-title" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Выберите подходящее
            </h2>
          </div>
          <div>
            <DirectionsStackCarousel directions={directions} />
          </div>
        </div>
      </Scene>

      <Scene id="about" labelledBy="about-title">
        <div className="mx-auto w-full max-w-5xl px-4">
          <div className="glass-medium glass-float rounded-[32px] px-5 py-7 sm:px-10 sm:py-9">
            <div className="mb-3.5 flex flex-col items-center gap-3 text-center">
              <span className="eyebrow">О нас</span>
              <h2 id="about-title" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Почему мы?
              </h2>
            </div>
            <p
              className="mx-auto mb-6 max-w-2xl text-center text-base leading-relaxed text-[var(--text-secondary)] sm:mb-8"
            >
              Mirada Studio — пространство для тех, кто хочет танцевать
              фламенко в своём темпе: от первого урока до сцены.
              Онлайн-запись, абонементы и личный кабинет — всё в одном
              месте, через тот же Telegram-аккаунт, что и в боте студии.
            </p>
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[var(--glass-border)]">
              {WHY_US.map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-4 text-left sm:flex-col sm:gap-3 sm:px-6 sm:text-center"
                >
                  <WhyUsIcon variant={item.icon} />
                  <p className="text-[15px] leading-relaxed text-[var(--text-secondary)] sm:text-base">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Scene>

      <Scene id="schedule" labelledBy="schedule-title">
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <span className="eyebrow">Записаться</span>
            <h2 id="schedule-title" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Ближайшие занятия
            </h2>
          </div>
          <div>
            {scheduleResult.ok ? (
              <BookableScheduleList
                slots={upcoming}
                isAuthenticated={currentUser !== null}
                classKey={null}
                cancellationDeadlineHours={rules.cancellation_deadline_hours}
                bookedSlotIds={bookedSlotIds}
                hasTelegram={currentUser?.telegram_id != null}
                waitlistedSlotIds={waitlistedSlotIds}
                rebookTimes={rebookTimes}
              />
            ) : (
              <ServiceUnavailableNotice />
            )}
          </div>
          {schedule.length > upcoming.length && (
            <div className="mt-6 flex justify-center">
              <Link href="/schedule" className={`${GLASS_BUTTON_CLASS} glass-float px-6 py-3 text-sm font-semibold`}>
                Все занятия →
              </Link>
            </div>
          )}
        </div>
      </Scene>

    </HomeStory>
  );
}

// Секция главной; dark — тёмный кадр hero поверх фона-сцены.
function Scene({
  id,
  dark = false,
  labelledBy,
  children,
}: {
  id: string;
  dark?: boolean;
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={dark ? "scene scene--dark stage-dark" : "scene"}
    >
      {children}
    </section>
  );
}

// Иконки для "Почему мы?" — разные и по теме каждого пункта (группы,
// уровни, расписание). Реальных фото студии/преподавателей в проекте нет,
// выдумывать их нельзя (CLAUDE.md §27). Подложка — "вдавленная" линза
// (glass-quiet) в материале панели, а не второй лист стекла поверх неё.
function WhyUsIcon({ variant }: { variant: "group" | "levels" | "calendar" }) {
  return (
    <div
      className="glass-quiet flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-[var(--primary)]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {variant === "group" && (
          <>
            <circle cx="8.5" cy="8" r="2.8" />
            <circle cx="16" cy="9.3" r="2.2" />
            <path d="M3 19c0-3.1 2.5-5.3 5.5-5.3s5.5 2.2 5.5 5.3" />
            <path d="M14.5 14.3c2.1.4 3.5 2.3 3.5 4.7" />
          </>
        )}
        {variant === "levels" && (
          <>
            <rect x="4" y="13" width="3.2" height="7" rx="0.6" />
            <rect x="10.4" y="9" width="3.2" height="11" rx="0.6" />
            <rect x="16.8" y="4.5" width="3.2" height="15.5" rx="0.6" />
          </>
        )}
        {variant === "calendar" && (
          <>
            <rect x="3.5" y="5" width="17" height="15" rx="2" />
            <path d="M3.5 9.5h17M8 3v4M16 3v4" />
          </>
        )}
      </svg>
    </div>
  );
}
