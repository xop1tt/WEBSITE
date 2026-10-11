import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StudioMap } from "@/components/StudioMap";
import { CONTACTS } from "@/lib/contacts";
import { TelegramIcon } from "@/components/TelegramIcon";

export const metadata: Metadata = {
  title: "Контакты",
};

// Telegram-бот — не плейсхолдер, username уже настроен в окружении (тот же,
// что используется в hero на главной и для входа).
const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export default function ContactPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">Контакты</h1>
      </div>
      <p className="text-lg leading-relaxed text-[var(--text-secondary)]">
        Свяжитесь со студией любым удобным способом — поможем выбрать
        направление и время занятия.
      </p>
      <div className="grid gap-6 rounded-[28px] glass-medium p-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <dl className="flex flex-col gap-4">
          <ContactRow label="Адрес" value={CONTACTS.address} />
          <ContactRow
            label="Телефон"
            value={CONTACTS.phone}
            href={`tel:${CONTACTS.phoneHref}`}
            action={TELEGRAM_BOT_USERNAME ? <TelegramLink username={TELEGRAM_BOT_USERNAME} /> : undefined}
          />
          <ContactRow label="Email" value={CONTACTS.email} href={`mailto:${CONTACTS.email}`} />
        </dl>
        <StudioMap coords={CONTACTS.coords} address={CONTACTS.address} />
      </div>
    </div>
  );
}

// Иконка Telegram рядом с телефоном: фирменный голубой, ведёт в бота студии.
function TelegramLink({ username }: { username: string }) {
  return (
    <a
      href={`https://t.me/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Написать в Telegram"
      title="Написать в Telegram"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#229ED9] text-white transition-[filter,transform] hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#229ED9]"
    >
      <TelegramIcon />
    </a>
  );
}

function ContactRow({
  label,
  value,
  href,
  action,
}: {
  label: string;
  value: string;
  href?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-medium">{label}</dt>
      <dd className="flex items-center gap-2.5 break-words text-[var(--text-secondary)]">
        {href ? (
          <a href={href} className="underline-offset-4 hover:text-[var(--text-primary)] hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
        {action}
      </dd>
    </div>
  );
}
