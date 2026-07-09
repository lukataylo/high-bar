import { DIMENSIONS, type TasteVector } from "../taste/dimensions";

interface Props {
  taste: TasteVector;
  confidence?: TasteVector;
  size?: number;
  color?: string;
}

// Radar chart of the 14 dimensions. SVG, no chart lib needed.
export function TasteRadar({ taste, confidence, size = 240, color = "#8b5cf6" }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;
  const n = DIMENSIONS.length;

  const point = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const;
  };

  const valuePath = DIMENSIONS.map((d, i) => {
    const [px, py] = point(i, r * Math.max(0.04, taste[d.key]));
    return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
  }).join(" ") + " Z";

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Taste radar">
      {rings.map((rr) => (
        <polygon
          key={rr}
          points={DIMENSIONS.map((_, i) => point(i, r * rr).join(",")).join(" ")}
          fill="none"
          stroke="rgba(17,17,17,0.14)"
          strokeWidth={1}
        />
      ))}
      {DIMENSIONS.map((_, i) => {
        const [px, py] = point(i, r);
        return <line key={i} x1={cx} y1={cy} x2={px} y2={py} stroke="rgba(17,17,17,0.1)" strokeWidth={1} />;
      })}
      <path d={valuePath} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {DIMENSIONS.map((d, i) => {
        const [px, py] = point(i, r * Math.max(0.04, taste[d.key]));
        const locked = confidence && confidence[d.key] > 0.66;
        return <circle key={d.key} cx={px} cy={py} r={locked ? 4 : 2.5} fill={locked ? "#c4b5fd" : color} />;
      })}
      {DIMENSIONS.map((d, i) => {
        const [lx, ly] = point(i, r + 16);
        return (
          <text
            key={d.key}
            x={lx}
            y={ly}
            fontSize={7.5}
            fill="#514b57"
            textAnchor="middle"
            dominantBaseline="middle"
            fontWeight={600}
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
