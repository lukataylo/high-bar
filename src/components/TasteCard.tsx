import { DIMENSIONS, type TasteVector } from "../taste/dimensions";
import { pickFontPairing } from "../taste/fonts";
import { styleName } from "../taste/name";
import type { Tokens } from "../taste/tokens";
import { TasteRadar } from "./TasteRadar";

interface Props {
  taste: TasteVector;
  confidence: TasteVector;
  tokens: Tokens;
  hue: number;
  swipeCount: number;
  overall: number;
  onGenerate: () => void;
}

export function TasteCard({ taste, confidence, tokens, hue, swipeCount, overall, onGenerate }: Props) {
  const name = styleName(taste, hue);
  const pairing = pickFontPairing(taste);
  const swatches = [
    tokens.palette.bg,
    tokens.palette.surfaceAlt,
    tokens.palette.text,
    tokens.palette.primary,
    tokens.palette.accent,
  ];
  const locked = DIMENSIONS.filter((d) => confidence[d.key] > 0.66);

  return (
    <div className="fingerprint">
      <div className="fp-header">
        <div className="fp-eyebrow">Your Style Compass</div>
        <div className="fp-name" style={{ fontFamily: pairing.display }}>
          {name}
        </div>
        <div className="fp-meta">
          {swipeCount} swipes · {Math.round(overall * 100)}% locked
        </div>
      </div>

      <div className="fp-radar">
        <TasteRadar taste={taste} confidence={confidence} size={260} />
      </div>

      <div className="fp-palette">
        {swatches.map((c, i) => (
          <div key={i} className="fp-swatch" style={{ background: c }} />
        ))}
      </div>

      <div className="fp-type">
        <div className="fp-type-label">Type pairing</div>
        <div className="fp-type-fonts">
          <span style={{ fontFamily: pairing.display, fontWeight: tokens.fontWeightDisplay, fontSize: 22 }}>
            {pairing.name.split(" / ")[0]}
          </span>
          <span style={{ fontFamily: pairing.body, fontWeight: tokens.fontWeightBody, color: "#9a9aa8" }}>
            {pairing.name.split(" / ")[1] ?? pairing.name}
          </span>
        </div>
      </div>

      {locked.length > 0 && (
        <div className="fp-locked">
          {locked.map((d) => {
            const v = taste[d.key];
            return (
              <span className="fp-lock-chip" key={d.key}>
                {v < 0.5 ? d.low : d.high}
              </span>
            );
          })}
        </div>
      )}

      <button className="fp-generate" onClick={onGenerate}>
        Compile my taste → <code>.cursor/rules/taste.mdc</code>
      </button>
    </div>
  );
}
