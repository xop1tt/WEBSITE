"use client";

import { useEffect, useRef, useState } from "react";
import { HEADER_CONTROL_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";

type Coords = { lon: number; lat: number };

// Встроенная карта Яндекса (map-widget не требует API-ключа; ссылку на
// полные Яндекс.Карты виджет показывает сам). pt — метка студии,
// rtext — маршрут «откуда угодно → сюда».
function widgetUrl({ lon, lat }: Coords, zoom: number) {
  return `https://yandex.ru/map-widget/v1/?ll=${lon},${lat}&z=${zoom}&pt=${lon},${lat},pm2rdm`;
}
function routeUrl({ lon, lat }: Coords) {
  return `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=auto`;
}

export function StudioMap({ coords, address }: { coords: Coords; address: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  // <dialog> через showModal: фокус внутри окна, Escape закрывает, остальная
  // страница недоступна. Крупная карта монтируется только в открытом окне.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <div className="flex flex-col">
      {/* Миниатюра не перехватывает прокрутку и жесты: iframe без событий,
          поверх — кнопка, разворачивающая карту. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Развернуть карту"
        className="group relative block h-52 w-full overflow-hidden rounded-[22px] border border-[var(--border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        <iframe
          src={widgetUrl(coords, 15)}
          title={`Карта: ${address}`}
          loading="lazy"
          tabIndex={-1}
          className="pointer-events-none h-full w-full"
        />
        <span className="glass-dense absolute top-2.5 left-2.5 flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-primary)] transition-opacity sm:opacity-80 sm:group-hover:opacity-100">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3.5h4.5V8M8 16.5H3.5V12M16.5 3.5l-5 5M3.5 16.5l5-5" />
          </svg>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Клик по затемнению (сам <dialog>, не его содержимое) закрывает окно.
          if (event.target === event.currentTarget) setOpen(false);
        }}
        aria-labelledby="studio-map-title"
        className="glass-dense m-auto h-[min(85dvh,760px)] w-[min(calc(100vw-32px),1040px)] max-w-none rounded-[28px] p-0 text-[var(--text-primary)] backdrop:bg-black/55"
      >
        {open && (
          <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 pl-2">
              <div className="min-w-0">
                <h2 id="studio-map-title" className="font-heading text-lg font-bold tracking-tight">
                  Как добраться?
                </h2>
                <p className="truncate text-sm text-[var(--text-secondary)]">{address}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть карту"
                className={HEADER_CONTROL_CLASS}
              >
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 5l10 10M15 5 5 15" />
                </svg>
              </button>
            </div>
            <iframe
              src={widgetUrl(coords, 16)}
              title={`Карта: ${address}`}
              allowFullScreen
              className="min-h-0 w-full flex-1 rounded-[20px] border border-[var(--border)]"
            />
            <div className="flex">
              <a
                href={routeUrl(coords)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-sm`}
              >
                Построить маршрут
              </a>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
