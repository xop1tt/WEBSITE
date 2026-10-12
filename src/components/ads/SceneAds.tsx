import { AdBanner } from "./AdBanner";

// Рекламные места секции главной: два баннера по бокам, по центру высоты
// секции. Стоят на месте вместе с секцией (не едут за прокруткой). Секция
// должна быть position: relative (.scene). Только на широком экране
// (.scene-ad в globals.css).
export function SceneAds() {
  return (
    <>
      <div className="scene-ad scene-ad--left">
        <AdBanner side="left" />
      </div>
      <div className="scene-ad scene-ad--right">
        <AdBanner side="right" />
      </div>
    </>
  );
}
