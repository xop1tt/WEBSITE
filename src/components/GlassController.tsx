"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";

const HEADER_DENSITY_DISTANCE = 240;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
// Блик под курсором убран на интерактивных элементах (кнопки, nav, —
// .glass-interactive) по запросу; на некликабельных карточках
// (.glass-specular — ScheduleCard/PackagesGrid) он остался.
const SPECULAR_SELECTOR = ".glass-specular";

/**
 * Единственный источник "живых" параметров glass-материала и шапки,
 * монтируется один раз в layout:
 *
 * 1. Scroll — тот же GSAP ScrollTrigger, что и у scroll-сцен главной (не
 *    второй scroll-листенер): пишет на <html> --glass-header-density (0..1)
 *    — чистую функцию абсолютной scroll-позиции (f(scrollY)), без
 *    play()/reverse() и без состояния, зависящего от истории жеста.
 *    Меняет только плотность стекла шапки; состав и положение её
 *    элементов от прокрутки не зависят.
 * 2. Pointer — один pointermove на document + один rAF: двигает --mx/--my
 *    только у .glass-specular карточки под курсором (на кнопках/навигации
 *    блик убран — см. SPECULAR_SELECTOR). Только мышь и только без
 *    prefers-reduced-motion; на touch блика нет вовсе (CSS).
 *
 * Ничего не рендерит.
 */
export function GlassController() {
  useEffect(() => {
    const root = document.documentElement;

    const applyScroll = (y: number) => {
      const density = clamp01(y / HEADER_DENSITY_DISTANCE);
      root.style.setProperty("--glass-header-density", density.toFixed(3));
    };

    applyScroll(window.scrollY);

    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => applyScroll(self.scroll()),
      onRefresh: (self) => applyScroll(self.scroll()),
    });

    return () => {
      trigger.kill();
      root.style.removeProperty("--glass-header-density");
    };
  }, []);

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!canHover.matches || reducedMotion.matches) return;

    let frame = 0;
    let lastEvent: PointerEvent | null = null;

    const update = () => {
      frame = 0;
      const event = lastEvent;
      if (!event || !(event.target instanceof Element)) return;
      const el = event.target.closest<HTMLElement>(SPECULAR_SELECTOR);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      lastEvent = event;
      if (!frame) frame = requestAnimationFrame(update);
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
