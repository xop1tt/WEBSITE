import { AdBanner } from "./AdBanner";

// Рекламные места по бокам сайта — на всех страницах, кроме главной (там свои
// баннеры в секциях, см. SceneAds) и только на широком экране, где по бокам
// контента есть свободное место (стили — .ad-rail в globals.css).
export function SideAds() {
  return (
    <>
      <div className="ad-rail ad-rail--left">
        <AdBanner side="left" />
      </div>
      <div className="ad-rail ad-rail--right">
        <AdBanner side="right" />
      </div>
    </>
  );
}
