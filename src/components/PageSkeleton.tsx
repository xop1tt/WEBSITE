// Заготовка страницы на время загрузки (loading.tsx): переход срабатывает
// сразу, а не через ~0,5–1 с ответа сервера. Блоки — тот же материал, что у
// карточек, только пустые и слегка «дышат».

export function PageSkeleton({ blocks = 3, title = true }: { blocks?: number; title?: boolean }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Загрузка…</span>
      {title && <div className="skeleton-line h-9 w-56 rounded-full" />}
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="skeleton-block glass-medium flex flex-col gap-3 rounded-[24px] p-6">
          <div className="skeleton-line h-4 w-1/3 rounded-full" />
          <div className="skeleton-line h-3 w-2/3 rounded-full" />
        </div>
      ))}
    </div>
  );
}
