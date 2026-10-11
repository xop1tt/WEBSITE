import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Авторы изображений",
};

// Атрибуция для сторонних изображений под CC BY/CC0 (вежливая практика даже
// там, где лицензия её не требует). Источник истины —
// public/assets/CREDITS.md; при замене ассетов обновлять оба. Сейчас
// сторонние изображения — только фото-заглушки в блоке «О нас» (общественное
// достояние / CC0); кастаньеты на главной нарисованы для проекта.
const CREDITS: {
  use: string;
  title: string;
  href: string;
  author: string;
  license: string;
  licenseHref: string;
}[] = [
  {
    use: "Блок «О нас» на главной (временная заглушка)",
    title: "El Jaleo",
    href: "https://commons.wikimedia.org/wiki/File:John_Singer_Sargent_-_El_Jaleo.jpg",
    author: "Джон Сингер Сарджент, 1882",
    license: "общественное достояние",
    licenseHref: "https://creativecommons.org/publicdomain/mark/1.0/",
  },
  {
    use: "Блок «О нас» на главной (временная заглушка)",
    title: "The Spanish Dancer (Study for El Jaleo)",
    href: "https://commons.wikimedia.org/wiki/File:Sargent_John_Singer_Spanish_Dancer.jpg",
    author: "Джон Сингер Сарджент",
    license: "общественное достояние",
    licenseHref: "https://creativecommons.org/publicdomain/mark/1.0/",
  },
  {
    use: "Блок «О нас» на главной (временная заглушка)",
    title: "Flamenco Guitar (MET DP-13193-001)",
    href: "https://commons.wikimedia.org/wiki/File:Flamenco_Guitar_MET_DP-13193-001.jpg",
    author: "The Metropolitan Museum of Art",
    license: "CC0",
    licenseHref: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
];

export default function CreditsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-16">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Авторы изображений</h1>
      <p className="text-[var(--text-secondary)]">
        Кастаньеты в блоке «О нас» нарисованы для этого сайта, без
        фотографической основы. Фото-заглушки в блоке «О нас» — произведения
        в общественном достоянии и CC0 из Wikimedia Commons.
      </p>
      <ul className="flex flex-col gap-3">
        {CREDITS.map((credit) => (
          <li key={credit.href} className="glass-medium rounded-2xl p-5">
            <div className="text-sm text-[var(--text-secondary)]">{credit.use}</div>
            <a className="font-medium underline" href={credit.href} target="_blank" rel="noopener noreferrer">
              «{credit.title}»
            </a>{" "}
            — {credit.author},{" "}
            <a className="underline" href={credit.licenseHref} target="_blank" rel="noopener noreferrer">
              {credit.license}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
