// МАКЕТ: рекламные места пока пустые — баннер показывает приглашение
// разместиться. Когда появятся рекламодатели, заменить содержимое здесь (или
// вывести код рекламной сети) — размеры слота не менять.

export type AdSide = "left" | "right";

const BACKGROUNDS: Record<AdSide, string> = {
  left: "radial-gradient(120% 70% at 20% 0%, #d8506c 0%, transparent 60%), linear-gradient(170deg, #7a1228, #2b0711)",
  right: "radial-gradient(110% 70% at 80% 0%, #f1b25a 0%, transparent 62%), linear-gradient(170deg, #b3263f, #4a0a1a)",
};

// Вертикальный баннер 160×600 (стандартный «небоскрёб»).
export function AdBanner({ side }: { side: AdSide }) {
  return (
    <aside
      aria-label="Реклама"
      className="ad-banner"
      style={{ background: BACKGROUNDS[side] }}
    >
      <span className="ad-banner__label">Реклама</span>
      <strong className="ad-banner__headline">
        Здесь могла бы быть ваша реклама
      </strong>
    </aside>
  );
}
