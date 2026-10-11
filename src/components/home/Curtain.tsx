// Театральный занавес на фоне hero: две портьеры по бокам, стянутые
// золотыми подхватами. Чистый CSS (globals.css, .curtain);
// нижний край заходит на следующий блок — как будто занавес поднимают.
export function Curtain() {
  return (
    <div className="curtain" aria-hidden="true">
      <div className="curtain-side curtain-side--left">
        <div className="curtain-drape" />
        <div className="curtain-tie" />
      </div>
      <div className="curtain-side curtain-side--right">
        <div className="curtain-drape" />
        <div className="curtain-tie" />
      </div>
    </div>
  );
}
