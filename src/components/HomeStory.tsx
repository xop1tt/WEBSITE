import type { ReactNode } from "react";

/**
 * Каркас главной: обычная страница из секций, фон-сцена (stage) лежит
 * позади hero. Цвета сцены задают токены темы (--stage-*, globals.css).
 */
export function HomeStory({ stage, children }: { stage: ReactNode; children: ReactNode }) {
  return (
    <div className="scenes">
      <div className="scenes-viewport">
        {stage}
        <div className="scenes-layer">{children}</div>
      </div>
    </div>
  );
}
