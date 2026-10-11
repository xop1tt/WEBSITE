"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Каркас главной: обычная страница из секций, фон-сцена (stage) лежит
 * позади hero.
 *
 * Клиентская часть только сообщает шапке, тёмный ли кадр hero под ней
 * (--stage-dark — адаптивное стекло в светлой теме).
 */
export function HomeStory({ stage, children }: { stage: ReactNode; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement;
    const hero = root.querySelector<HTMLElement>(".scene--dark");

    const update = () => {
      const probe = 40;
      const rect = hero?.getBoundingClientRect();
      const dark = rect ? rect.top <= probe && rect.bottom > probe : false;
      html.style.setProperty("--stage-dark", dark ? "1" : "0");
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      html.style.removeProperty("--stage-dark");
    };
  }, []);

  return (
    <div ref={rootRef} className="scenes">
      <div className="scenes-viewport">
        {stage}
        <div className="scenes-layer">{children}</div>
      </div>
    </div>
  );
}
