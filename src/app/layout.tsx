import type { Metadata } from "next";
import { Comfortaa } from "next/font/google";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GlassController } from "@/components/GlassController";
import { MaintenanceNotice } from "@/components/MaintenanceNotice";
import { formatClassDateTime } from "@/lib/format";
import { NOTICE_REQUEST_HEADER, parseNotice } from "@/lib/maintenance";
import "./globals.css";

// Geist/Geist Mono были в стартовом шаблоне Next.js, но сайт нигде не
// использует font-sans/font-mono (body — Arial, см. globals.css) — шрифты
// грузились впустую, убраны.
const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  weight: ["600", "700"],
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Mirada Studio",
    template: "%s — Mirada Studio",
  },
  description: "Студия фламенко: расписание, абонементы и запись на занятия.",
};

// Выставляет data-theme на <html> до первой отрисовки, чтобы не было
// вспышки светлой темы перед применением сохранённого выбора. Должен
// выполняться синхронно и раньше гидратации — отсюда обычный <script>,
// а не useEffect. suppressHydrationWarning на <html> гасит ожидаемое
// несовпадение атрибута между сервером (его не знает) и клиентом.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'system';
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {}
})();
`;

// Предупреждение о запланированных техработах: время передаёт proxy
// (src/proxy.ts) заголовком запроса — layout не ходит в backend сам.
async function maintenanceNotice() {
  const notice = parseNotice((await headers()).get(NOTICE_REQUEST_HEADER), Date.now());
  if (!notice) return null;
  const start = formatClassDateTime(notice.starts_at);
  let until = "";
  if (notice.ends_at) {
    // Тот же день — только время окончания; через полночь — с датой.
    const end = formatClassDateTime(notice.ends_at);
    until = ` до ${end.split(" · ")[0] === start.split(" · ")[0] ? end.split(" · ")[1] : end}`;
  }
  return (
    <MaintenanceNotice
      dismissKey={notice.starts_at}
      text={`Плановые технические работы: ${start}${until} (время студии). В это время сайт будет недоступен, Telegram-бот работает как обычно.`}
    />
  );
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const notice = await maintenanceNotice();
  return (
    <html
      lang="ru"
      className={`${comfortaa.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <div className="site-backdrop" aria-hidden="true" />
        <GlassController />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {notice}
      </body>
    </html>
  );
}
