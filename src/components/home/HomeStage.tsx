import { CastanetsArt, FanArt } from "./StageArt";

// Сцена главной — всё, что позади и вокруг контента (aria-hidden: смысл
// страницы несут сами сцены с текстом и кнопками).
//
//   .stage            фон, сзади: база → пол → софит → луч света → виньетка
//   .stage-fan        веер — позади текста hero
//   .stage-castanets  кастаньеты — на переднем плане
//
// Положение реквизита — CSS (globals.css). С началом прокрутки он улетает
// вверх (HomeStory ставит data-props-away): внешний якорь сдвигается через
// translate, внутренняя обёртка (-swing/-spin) поворачивается.

export function HomeStage() {
  return (
    <>
      <div className="stage" aria-hidden="true">
        <div className="stage-base" />
        <div className="stage-floor" />
        <div className="stage-spot" />
        <div className="stage-beam" />
        <div className="stage-vignette" />
      </div>

      <div className="stage-anchor stage-fan" aria-hidden="true">
        <div className="stage-fan-swing">
          <FanArt className="stage-fan-art" />
        </div>
      </div>

      <div className="stage-anchor stage-castanets" aria-hidden="true">
        <div className="stage-castanets-spin">
          <CastanetsArt className="stage-castanets-art" />
        </div>
      </div>
    </>
  );
}
