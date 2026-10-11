import type { Metadata } from "next";
import { StudioMap } from "@/components/StudioMap";
import { CONTACTS } from "@/lib/contacts";

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
        <span className="eyebrow">Mirada Studio</span>
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">Контакты</h1>
      </div>
      <p className="text-lg leading-relaxed text-[var(--text-secondary)]">
        Свяжитесь со студией любым удобным способом — поможем выбрать
        направление и время занятия.
      </p>
      {TELEGRAM_BOT_USERNAME && (
        <a
          href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-fit gap-2 rounded-full px-6 py-3 text-base font-semibold"
        >
          Написать в Telegram
        </a>
      )}
      <div className="grid gap-6 rounded-[28px] glass-medium p-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <dl className="flex flex-col gap-4">
          <ContactRow label="Адрес" value={CONTACTS.address} />
          <ContactRow label="Телефон" value={CONTACTS.phone} href={`tel:${CONTACTS.phoneHref}`} />
          <ContactRow label="Email" value={CONTACTS.email} href={`mailto:${CONTACTS.email}`} />
        </dl>
        <StudioMap coords={CONTACTS.coords} address={CONTACTS.address} />
      </div>
    </div>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-medium">{label}</dt>
      <dd className="break-words text-[var(--text-secondary)]">
        {href ? (
          <a href={href} className="underline-offset-4 hover:text-[var(--text-primary)] hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
