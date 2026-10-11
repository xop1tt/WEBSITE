import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getSchedule, isBookable } from "@/lib/api";
import { getDirections } from "@/lib/directions";
import { formatClassDateTime } from "@/lib/format";
import { GLASS_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { HomeStory } from "@/components/HomeStory";
import { TelegramIcon } from "@/components/TelegramIcon";
import { HomeStage } from "@/components/home/HomeStage";
import { Curtain } from "@/components/home/Curtain";
import { CastanetsArt } from "@/components/home/StageArt";

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

// Расписание и абонементы меняются (места заполняются, цены может менять
// студия), поэтому страницу нельзя кэшировать статически на этапе сборки —
// см. README.md.
export const dynamic = "force-dynamic";


// Главная — обычная страница из секций (HomeStory): hero с театральным
// занавесом, «О нас», «Наши направления».
export default async function HomePage() {
  const [scheduleResult, directions] = await Promise.all([getSchedule(), getDirections()]);
  // Только занятия, на которые можно записаться (как в боте) — для hero.
  const allSlots = scheduleResult.ok ? scheduleResult.data : [];
  const schedule = allSlots.filter(isBookable);
  const nextClass = schedule[0];
  // Пока расписание пустое, вести главный CTA в расписание некуда —
  // ведём туда, где можно реально оставить заявку (см. аудит, пункт 3.2).
  const heroCtaHref = schedule.length > 0 ? "/schedule" : "/contact";
  const heroCtaLabel =
    schedule.length > 0 ? "Записаться" : "Оставить заявку";

  return (
    <HomeStory stage={<HomeStage />}>
      <Scene id="hero" dark labelledBy="hero-title">
        <Curtain />
        <div className="relative z-[4] mx-auto w-full max-w-6xl px-5 sm:px-6">
          <div className="stage-copy mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <div className="flex flex-col items-center gap-3">
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
            {/* Карточка стоит над кнопками и растягивается до их общей ширины. */}
            <div className="mt-1 flex w-fit max-w-full flex-col items-stretch gap-3">
              {nextClass && (
                <Link
                  href="/schedule"
                  className="glass-subtle glass-float glass-interactive flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-2.5 text-sm [text-shadow:none]"
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
              <div className="flex flex-wrap justify-center gap-3 [text-shadow:none]">
                <Link href={heroCtaHref} className={`${PRIMARY_BUTTON_CLASS} px-7 py-3.5 text-base`}>
                  {heroCtaLabel}
                </Link>
                {TELEGRAM_BOT_USERNAME && (
                  <a
                    href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${GLASS_BUTTON_CLASS} glass-float inline-flex items-center gap-2.5 px-7 py-3.5 text-base font-semibold`}
                  >
                    Написать в Telegram
                    <span className="text-[#29B6F6]">
                      <TelegramIcon size={20} />
                    </span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <a href="#about" className="scroll-hint z-[4] glass-subtle glass-float glass-interactive">
          <span>Потанцуем?</span>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" />
          </svg>
        </a>
      </Scene>

      <Scene id="about" labelledBy="about-title">
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="relative">
            <div className="glass-medium glass-float relative isolate rounded-[32px] px-5 pb-32 pt-36 sm:px-10 sm:pb-40 sm:pt-44 lg:px-16 lg:py-16">
              {/* Фото-заглушки (общественное достояние / CC0, см. /credits)
                  «выпадают» из карточки (при наведении выезжают из-за неё ещё чуть
                дальше): внутри неё они лежат позади текста под
                  вуалью цвета стекла (чтобы текст читался в любой теме), а
                  часть, не поместившаяся в карточку, торчит наружу без вуали. Вместо них можно поставить
                  реальные снимки студии. */}
              <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
              <figure className="absolute pointer-events-auto transition-[translate] duration-300 ease-out hover:-translate-x-3 hover:-translate-y-3 -left-3 -top-8 aspect-[3/2] w-[52%] -rotate-6 sm:-left-12 sm:-top-6 sm:w-[46%] lg:-left-[15%] lg:-top-12 lg:w-[34%] overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)] ring-1 ring-white/10" aria-hidden="true">
                <Image src="/assets/about/el-jaleo.webp" alt="" fill sizes="(min-width: 1024px) 400px, 60vw" className="object-cover" />
              </figure>
              <figure className="absolute pointer-events-auto transition-[translate] duration-300 ease-out hover:translate-x-3 hover:-translate-y-1 -right-3 -top-6 aspect-[3/4] w-[34%] rotate-6 sm:-right-10 sm:-top-8 sm:w-[28%] lg:-right-[14%] lg:top-[24%] lg:w-[24%] overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)] ring-1 ring-white/10" aria-hidden="true">
                <Image src="/assets/about/spanish-dancer.webp" alt="" fill sizes="(min-width: 1024px) 260px, 45vw" className="object-cover" />
              </figure>
              <figure className="absolute pointer-events-auto transition-[translate] duration-300 ease-out hover:-translate-x-2 hover:translate-y-3 -bottom-8 left-[4%] aspect-[3/4] w-[30%] rotate-3 sm:-bottom-12 sm:left-[6%] sm:w-[22%] lg:-bottom-14 lg:left-[2%] lg:w-[19%] overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)] ring-1 ring-white/10" aria-hidden="true">
                <Image src="/assets/about/flamenco-guitar.webp" alt="" fill sizes="(min-width: 1024px) 160px, 34vw" className="object-cover object-[50%_60%]" />
              </figure>
                </div>

              <div className="about-copy mx-auto flex max-w-md sm:max-w-[26rem] flex-col items-center gap-4 text-center">
                <h2 id="about-title" className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  Фламенко — это про вас, а не про идеальную технику
                </h2>
                <p className="text-base leading-relaxed text-[var(--text-primary)] sm:text-[17px]">
                  Не нужно уметь танцевать, быть гибкой или «подходящего»
                  возраста. Достаточно желания попробовать: мы начнём с первого
                  шага и дойдём до тех мгновений, когда ритм подхватывает сам, а
                  плечи расправляются, будто вы всегда так ходили.
                </p>
                <p className="text-base leading-relaxed text-[var(--text-primary)] sm:text-[17px]">
                  В Mirada Studio занимаются небольшими группами — здесь вас
                  заметят и по-доброму поправят, никто не потеряется. Занятия
                  подойдут любому уровню: от самого первого шага до постановки
                  номера, и для каждого найдётся своя группа. А если хочется
                  двигаться только в своём темпе, можно заниматься
                  индивидуально.
                </p>
                <p className="text-base leading-relaxed text-[var(--text-primary)] sm:text-[17px]">
                  Расписание гибкое, так что выбрать удобное время просто.
                  Записаться можно за пару минут здесь же, на сайте.
                </p>
              </div>
            </div>
            {/* Кастаньеты «повешены» на углу: шнур продет в отверстие в
                карточке и они покачиваются. Поверх карточки (позже в потоке). */}
            <div className="about-hang" aria-hidden="true">
              <span className="about-hang-hole" />
              <div className="about-hang-swing">
                <CastanetsArt className="stage-castanets-art" />
              </div>
            </div>
          </div>
        </div>
      </Scene>

      <Scene id="directions" labelledBy="directions-title">
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="glass-medium glass-float relative isolate rounded-[32px] px-5 py-10 sm:px-10 sm:py-14">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
              <h2 id="directions-title" className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Наши направления
              </h2>
              <p className="text-base leading-relaxed text-[var(--text-primary)] sm:text-[17px]">
                У каждого направления свой характер и свой темп — выбирайте то,
                что откликается. А если сомневаетесь, начните с самого
                первого: мы подскажем.
              </p>
            </div>

            {directions.length > 0 ? (
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {directions.map((direction) => (
                  <li
                    key={direction.key}
                    className="glass-subtle flex flex-col gap-3 rounded-[24px] p-5 text-left sm:p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-heading text-xl font-bold tracking-tight">{direction.label}</h3>
                      {direction.level && (
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--primary-text)]">
                          {direction.level}
                        </span>
                      )}
                    </div>
                    <p className="flex-1 text-[15px] leading-relaxed text-[var(--text-secondary)]">
                      {direction.description}
                    </p>
                    <Link
                      href={`/schedule?class_key=${encodeURIComponent(direction.key)}`}
                      className="w-fit text-sm font-semibold text-[var(--primary-text)] underline-offset-4 hover:underline"
                    >
                      Выбрать занятие →
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mx-auto mt-8 max-w-xl text-center text-[var(--text-secondary)]">
                Каталог направлений сейчас недоступен. Попробуйте обновить
                страницу позже.
              </p>
            )}

            <p className="mx-auto mt-6 max-w-xl text-center text-[15px] leading-relaxed text-[var(--text-secondary)]">
              Хочется заниматься один на один? Индивидуальные занятия тоже
              возможны —{" "}
              <Link href="/contact" className="font-semibold text-[var(--primary-text)] underline-offset-4 hover:underline">
                напишите нам
              </Link>
              , и мы договоримся об удобном времени.
            </p>

            <div className="mt-8 flex justify-center">
              <Link href="/schedule" className={`${PRIMARY_BUTTON_CLASS} px-7 py-3 text-base`}>
                Смотреть расписание
              </Link>
            </div>
          </div>
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
