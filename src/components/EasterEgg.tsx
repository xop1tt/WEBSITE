"use client";

import { useEffect } from "react";

// Пасхалка: Konami-код (↑ ↑ ↓ ↓ ← → ← → B A) устраивает над страницей
// «¡Olé!» и дождь из лепестков. Без состояния и без React-рендера: элементы
// живут в document.body ровно пока идёт анимация. При prefers-reduced-motion
// лепестки не падают — остаётся только короткая надпись.
const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];
const PETALS = 48;
const GLYPHS = ["🌹", "🌹", "🌹", "💃", "🪭"];

function celebrate() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText =
    "position:fixed;inset:0;z-index:9999;pointer-events:none;overflow:hidden";

  const label = document.createElement("div");
  label.textContent = "¡Olé!";
  label.style.cssText =
    "position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);" +
    "font:700 clamp(3rem,12vw,8rem)/1 var(--font-comfortaa),sans-serif;" +
    "color:var(--primary);text-shadow:0 6px 40px rgba(165,46,72,.45);" +
    "letter-spacing:.02em";
  layer.append(label);
  label.animate(
    [
      { opacity: 0, transform: "translate(-50%,-50%) scale(.4) rotate(-8deg)" },
      { opacity: 1, transform: "translate(-50%,-50%) scale(1.08) rotate(2deg)", offset: 0.25 },
      { opacity: 1, transform: "translate(-50%,-50%) scale(1) rotate(0)", offset: 0.75 },
      { opacity: 0, transform: "translate(-50%,-50%) scale(1.15)" },
    ],
    { duration: 2600, easing: "ease-out", fill: "forwards" },
  );

  if (!reduced) {
    for (let i = 0; i < PETALS; i++) {
      const petal = document.createElement("span");
      petal.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      const size = 18 + Math.random() * 22;
      petal.style.cssText =
        `position:absolute;top:-60px;left:${Math.random() * 100}%;` +
        `font-size:${size}px;will-change:transform`;
      layer.append(petal);
      const drift = (Math.random() - 0.5) * 240;
      const spin = (Math.random() - 0.5) * 900;
      petal.animate(
        [
          { transform: "translate(0,0) rotate(0)", opacity: 1 },
          { transform: `translate(${drift}px,${window.innerHeight + 120}px) rotate(${spin}deg)`, opacity: 0.85 },
        ],
        {
          duration: 2600 + Math.random() * 2200,
          delay: Math.random() * 900,
          easing: "cubic-bezier(.3,.1,.6,1)",
          fill: "forwards",
        },
      );
    }
  }

  document.body.append(layer);
  window.setTimeout(() => layer.remove(), reduced ? 2800 : 6200);
}

export function EasterEgg() {
  useEffect(() => {
    let step = 0;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === KONAMI[step]) {
        step += 1;
        if (step === KONAMI.length) {
          step = 0;
          celebrate();
        }
      } else {
        step = key === KONAMI[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
