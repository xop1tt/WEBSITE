"use client";

import { useSyncExternalStore } from "react";

const STORAGE_PREFIX = "maintenance-notice-dismissed:";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("maintenance-notice", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("maintenance-notice", onChange);
  };
}

function isDismissed(key: string): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

/**
 * Ненавязчивое предупреждение о запланированных работах: плашка внизу
 * экрана, не сдвигает содержимое. Закрытие запоминается на время сессии
 * вкладки и только для этого окна работ (ключ — время начала): после
 * переноса предупреждение появится снова.
 */
export function MaintenanceNotice({ text, dismissKey }: { text: string; dismissKey: string }) {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => isDismissed(dismissKey),
    () => false,
  );
  if (dismissed) return null;

  function dismiss() {
    try {
      window.sessionStorage.setItem(STORAGE_PREFIX + dismissKey, "1");
    } catch {
      // Хранилище недоступно (приватный режим) — просто скрываем до перехода.
    }
    window.dispatchEvent(new Event("maintenance-notice"));
  }

  return (
    <div
      role="status"
      className="glass-dense fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-center gap-3 rounded-[22px] py-2.5 pl-4 pr-2 text-sm text-[var(--text-primary)] sm:inset-x-4"
    >
      <span className="maintenance-dot shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 leading-snug">{text}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Скрыть предупреждение"
        className="glass-subtle glass-interactive flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--primary-text)]"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <path d="M5 5l10 10M15 5 5 15" />
        </svg>
      </button>
    </div>
  );
}
