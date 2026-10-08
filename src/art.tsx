import type { CSSProperties } from "react";

const palettes = [
  ["#e9ddc3", "#234f72", "#bd8558"],
  ["#d7c4a4", "#756046", "#4f6f68"],
  ["#e8d3bd", "#7b4744", "#d19a6a"],
  ["#d9d4c7", "#384c61", "#a4865c"],
];

export function CarpetArt({
  variant = 0,
  className = "",
  style,
}: {
  variant?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [base, ink, accent] = palettes[variant % palettes.length];
  const id = `carpet-${variant}`;
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 420 560"
      role="img"
      aria-label="复古花卉地毯"
    >
      <defs>
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
          <circle cx="28" cy="28" r="5" fill={accent} opacity=".75" />
          <path d="M28 10 36 28 28 46 20 28Z" fill="none" stroke={ink} strokeWidth="2" opacity=".55" />
        </pattern>
      </defs>
      <rect x="8" y="8" width="404" height="544" rx="8" fill={ink} />
      <rect x="22" y="22" width="376" height="516" rx="5" fill={base} stroke={accent} strokeWidth="8" />
      <rect x="45" y="45" width="330" height="470" fill={`url(#${id})`} stroke={ink} strokeWidth="5" />
      <rect x="68" y="68" width="284" height="424" fill={base} stroke={accent} strokeWidth="3" />
      <g transform="translate(210 280)">
        <circle r="92" fill="none" stroke={ink} strokeWidth="18" opacity=".92" />
        <circle r="65" fill="none" stroke={accent} strokeWidth="13" />
        {Array.from({ length: 12 }).map((_, index) => (
          <ellipse
            key={index}
            cx="0"
            cy="-76"
            rx="18"
            ry="42"
            fill={ink}
            opacity=".9"
            transform={`rotate(${index * 30})`}
          />
        ))}
        <circle r="32" fill={base} stroke={ink} strokeWidth="9" />
        <circle r="12" fill={accent} />
      </g>
      <path d="M80 112 Q210 20 340 112M80 448 Q210 540 340 448" fill="none" stroke={ink} strokeWidth="8" opacity=".7" />
    </svg>
  );
}

export function RoomScene({
  variant = 0,
  className = "",
  selected = false,
}: {
  variant?: number;
  className?: string;
  selected?: boolean;
}) {
  const wall = ["#e8dfd1", "#ded6c9", "#ece5db", "#d8d7d2"][variant % 4];
  const sofa = ["#d9c8ae", "#c9bda9", "#ddd1c0", "#bfb7aa"][variant % 4];
  return (
    <svg className={className} viewBox="0 0 900 700" role="img" aria-label="奶油风客厅首图方案">
      <rect width="900" height="700" fill={wall} />
      <rect y="390" width="900" height="310" fill="#cfa878" />
      <path d="M0 430 900 430M0 500 900 500M0 570 900 570M0 640 900 640" stroke="#b88f62" strokeWidth="3" opacity=".5" />
      <rect x="605" y="0" width="250" height="390" fill="#f4f0e7" />
      <path d="M650 0V390M730 0V390M810 0V390" stroke="#ddd2c2" strokeWidth="4" />
      <rect x="86" y="205" width="390" height="190" rx="35" fill={sofa} />
      <rect x="112" y="165" width="150" height="105" rx="28" fill={sofa} />
      <rect x="275" y="165" width="170" height="105" rx="28" fill={sofa} />
      <rect x="135" y="213" width="86" height="72" rx="13" fill="#f1e4d1" transform="rotate(-5 178 249)" />
      <rect x="315" y="205" width="82" height="72" rx="13" fill="#a98a68" transform="rotate(5 356 241)" />
      <rect x="670" y="270" width="155" height="130" rx="62" fill="#e3d5bf" />
      <rect x="704" y="230" width="88" height="70" rx="35" fill="#e3d5bf" />
      <rect x="520" y="320" width="90" height="24" rx="12" fill="#8f6d4b" />
      <rect x="552" y="342" width="25" height="72" fill="#8f6d4b" />
      <g transform={`translate(${variant % 2 ? 247 : 225} ${variant % 3 ? 395 : 412}) rotate(${variant % 2 ? -5 : 4}) skewX(-12) scale(.95 .48)`}>
        <CarpetArt variant={0} />
      </g>
      <rect x="50" y="55" width="180" height="120" fill="#f2eadc" stroke="#94755b" strokeWidth="8" />
      <circle cx="140" cy="115" r="38" fill="#c8a983" />
      <path d="M475 150c28-80 70-90 95-10v145h-18V170c-16-35-38-25-58 5Z" fill="#82906d" />
      {selected && <rect x="7" y="7" width="886" height="686" rx="12" fill="none" stroke="#1f55e5" strokeWidth="14" />}
    </svg>
  );
}
