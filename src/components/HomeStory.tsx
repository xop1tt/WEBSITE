"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Ниже этой прокрутки (px) реквизит всегда на месте.
const HOME_ZONE = 24;

/**
 * Каркас главной: обычная страница из секций, фон-сцена (stage) лежит
 * позади hero.
 *
 *   .scenes            корень; data-props-away — реквизит улетел
 *     .scenes-viewport фон + реквизит (HomeStage, серверный)
 *       .scenes-layer  секции (children) поверх фона
 *
 * Веер и кастаньеты улетают вверх, как только страницу начали листать
 * вниз, и возвращаются, когда пользователь листает обратно к hero (пока
 * hero виден хотя бы наполовину). Само движение — CSS-переходы
 * (globals.css, [data-props-away]); при prefers-reduced-motion они
 * отключены, реквизит просто прячется.
 *
 * Ещё движок сообщает шапке, тёмный ли кадр под ней (--stage-dark —
 * адаптивное стекло в светлой теме).
 */
export function HomeStory({ stage, children }: { stage: ReactNode; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement;
    const hero = root.querySelector<HTMLElement>(".scene--dark");

    let lastY = window.scrollY;
    let away = false;
    const setAway = (next: boolean) => {
      if (next === away) return;
      away = next;
      root.toggleAttribute("data-props-away", next);
    };

    const update = () => {
      const y = window.scrollY;
      const heroH = hero?.offsetHeight ?? window.innerHeight;
      if (y <= HOME_ZONE) setAway(false);
      else if (y >= heroH * 0.5) setAway(true);
      // В зоне hero реагируем на направление: вниз — улетают, вверх — назад.
      else if (y > lastY) setAway(true);
      else if (y < lastY) setAway(false);
      lastY = y;

      const probe = 40;
      const rect = hero?.getBoundingClientRect();
      const dark = rect ? rect.top <= probe && rect.bottom > probe : false;
      html.style.setProperty("--stage-dark", dark ? "1" : "0");
    };

    // Открыли страницу уже прокрученной (возврат назад, якорь) — реквизит
    // сразу "в полёте", без анимации на старте.
    if (window.scrollY > HOME_ZONE) {
      root.toggleAttribute("data-props-instant", true);
      setAway(true);
      requestAnimationFrame(() => root.removeAttribute("data-props-instant"));
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      root.removeAttribute("data-props-away");
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
