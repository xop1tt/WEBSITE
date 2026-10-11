// Сцена главной — всё, что позади и вокруг контента (aria-hidden: смысл
// страницы несут сами сцены с текстом и кнопками).
//
//   .stage            фон, сзади: база → пол → софит → луч света → виньетка
// Занавес — отдельно (Curtain.tsx), кастаньеты — на карточке «О нас» (app/page.tsx).

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
    </>
  );
}
