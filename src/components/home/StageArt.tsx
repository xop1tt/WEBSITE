// Векторные кастаньеты (висят на углу карточки «О нас»). Нарисованы для
// этого сайта, без фотографической основы (см. public/assets/CREDITS.md).

export function CastanetsArt({ className }: { className?: string }) {
  // Половинка кастаньеты спереди: округлая чаша (тыльная сторона) с
  // широким "ушком" сверху — частью того же дерева, с отверстием, через
  // которое проходит шнур, связывающий пару.
  const shell =
    "M-34 -98 C -34 -107 34 -107 34 -98 L 36 -84 C 66 -76 84 -44 84 2 C 84 50 48 86 0 86 C -48 86 -84 50 -84 2 C -84 -44 -66 -76 -36 -84 Z";
  const half = (dx: number, dy: number, rot: number, key: string) => (
    <g key={key} transform={`translate(${dx} ${dy}) rotate(${rot})`}>
      <path d={shell} fill="url(#cast-wood)" stroke="#120603" strokeWidth="2" />
      <g fill="none" stroke="#e0a77a" strokeOpacity="0.07" strokeWidth="3">
        <path d="M-66 -10 C -36 -36 36 -36 66 -10" />
        <path d="M-74 26 C -40 2 40 2 74 26" />
        <path d="M-58 58 C -30 40 30 40 58 58" />
      </g>
      {/* Кромка чаши — светлый серп по левому краю даёт толщину дерева. */}
      <path d="M-66 -46 C -82 -4 -70 44 -34 72" stroke="#f0c39b" strokeOpacity="0.2" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="-28" cy="-34" rx="14" ry="26" transform="rotate(-34 -28 -34)" fill="#fff" fillOpacity="0.13" />
      <ellipse cx="0" cy="-93" rx="7" ry="4" fill="#0b0302" />
    </g>
  );

  return (
    <svg viewBox="-180 -170 360 300" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="cast-wood" cx="0.34" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#8a4424" />
          <stop offset="0.5" stopColor="#3a160a" />
          <stop offset="1" stopColor="#120603" />
        </radialGradient>
      </defs>
      {half(-60, 8, -14, "l")}
      {half(60, 20, 12, "r")}
      {/* Шнур — красный: продет сквозь ушки обеих половинок, сверху —
          петля под большой палец танцовщицы. */}
      <g fill="none" strokeLinecap="round">
        <path d="M -100 -84 C -60 -92 50 -84 96 -68" stroke="#9e1029" strokeWidth="7" />
        <path d="M -12 -86 C -40 -150 40 -156 16 -84" stroke="#9e1029" strokeWidth="6" />
        <path d="M -100 -84 C -60 -92 50 -84 96 -68" stroke="#e8455f" strokeWidth="2" strokeOpacity="0.5" />
        <path d="M -12 -86 C -40 -150 40 -156 16 -84" stroke="#e8455f" strokeWidth="1.6" strokeOpacity="0.45" />
      </g>
    </svg>
  );
}
