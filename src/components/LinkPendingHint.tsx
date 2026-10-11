"use client";

import { useLinkStatus } from "next/link";

// Полоска под ссылкой, пока её страница грузится: сервер отвечает ~0,5–1 с,
// и без отклика клик выглядит несработавшим. Элемент есть всегда и только
// меняет прозрачность — разметка не прыгает. Ставить только внутрь <Link>
// с position: relative (стеклянные классы его задают).
export function LinkPendingHint() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className="link-pending" data-pending={pending || undefined} />;
}
