import { parseColor, type Hsla } from "./color";

export interface WeightedColor {
  hsla: Hsla;
  weight: number;
}

export interface RawSignals {
  url: string;
  hostname: string;
  title: string;
  description: string;
  bgColors: WeightedColor[];
  textColors: WeightedColor[];
  tokenColors: WeightedColor[]; // custom-property (--foo: #hex) declarations — deliberate design tokens
  radiiPx: number[]; // 999 stands in for pill/fully-rounded
  borderWidthsPx: number[];
  fontFamilies: string[];
  fontWeights: number[];
  letterSpacingsEm: number[];
  paddingsPx: number[];
  gapsPx: number[];
  shadowCount: number;
  gradientCount: number;
  blurCount: number;
  uppercaseCount: number;
  motionCount: number; // transition/animation/@keyframes occurrences
  textureHintCount: number; // noise/grain/mix-blend-mode occurrences
  declarationCount: number; // rough CSS size, used to normalize the counts above into rates
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function fetchText(url: string, timeoutMs = 10000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!/text|css|html/.test(contentType) && contentType !== "") return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractColorsFromValue(value: string): Hsla[] {
  const matches = value.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) ?? [];
  const out: Hsla[] = [];
  for (const m of matches) {
    const c = parseColor(m);
    // Skip near-fully-transparent colors — they carry no real palette signal.
    if (c && c.a > 0.15) out.push(c);
  }
  return out;
}

function pushColors(list: WeightedColor[], colors: Hsla[], weight: number) {
  for (const c of colors) list.push({ hsla: c, weight });
}

function collectDeclarations(css: string, property: RegExp): string[] {
  const re = new RegExp(`(?:^|[;{])\\s*${property.source}\\s*:\\s*([^;}]+)`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) out.push(m[1].trim());
  return out;
}

function parseNumber(str: string): number | null {
  const m = str.match(/-?[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

export async function extractSignals(pageUrl: string): Promise<RawSignals | null> {
  const html = await fetchText(pageUrl);
  if (!html) return null;

  const url = new URL(pageUrl);
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? url.hostname).trim().slice(0, 80);
  const description = (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? ""
  )
    .trim()
    .slice(0, 140);

  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const linkHrefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)]
    .map((tag) => tag[0].match(/href=["']([^"']+)["']/i)?.[1])
    .filter((h): h is string => !!h)
    .slice(0, 5)
    .map((h) => {
      try {
        return new URL(h, url).toString();
      } catch {
        return null;
      }
    })
    .filter((h): h is string => !!h);

  const externalCss = await Promise.all(linkHrefs.map((href) => fetchText(href, 8000)));
  const css = [...styleBlocks, ...externalCss.filter((c): c is string => !!c)].join("\n");

  const inlineStyles = [...html.matchAll(/style=["']([^"']+)["']/gi)].map((m) => m[1]).join(";\n");
  const allCss = `${css}\n${inlineStyles}`;

  const bgColors: WeightedColor[] = [];
  const textColors: WeightedColor[] = [];
  const tokenColors: WeightedColor[] = [];

  for (const decl of collectDeclarations(allCss, /--[\w-]+/)) pushColors(tokenColors, extractColorsFromValue(decl), 2);
  for (const decl of collectDeclarations(allCss, /background(?:-color)?/)) pushColors(bgColors, extractColorsFromValue(decl), 1);
  for (const decl of collectDeclarations(allCss, /(?<!background-)color/)) pushColors(textColors, extractColorsFromValue(decl), 1);

  // The actual page background/text color almost always lives on html/body/
  // :root — weight those far above an incidental background on some deeply
  // nested component, which a plain declaration scan can't otherwise tell apart.
  const rootRuleRe = /(?:^|})\s*(?:html|body|:root|#root|#__next|#app|main)[^{]*\{([^}]+)\}/gi;
  let rootMatch: RegExpExecArray | null;
  while ((rootMatch = rootRuleRe.exec(allCss))) {
    const body = rootMatch[1];
    for (const decl of collectDeclarations(body, /background(?:-color)?/)) pushColors(bgColors, extractColorsFromValue(decl), 12);
    for (const decl of collectDeclarations(body, /(?<!background-)color/)) pushColors(textColors, extractColorsFromValue(decl), 12);
  }

  const radiiPx: number[] = [];
  for (const decl of collectDeclarations(allCss, /border-radius/)) {
    const first = decl.split(/\s+/)[0];
    if (first.includes("%")) {
      const pct = parseNumber(first) ?? 0;
      radiiPx.push(pct >= 40 ? 999 : (pct / 100) * 32);
    } else if (first.includes("px")) {
      radiiPx.push(Math.min(999, parseNumber(first) ?? 0));
    }
  }

  const borderWidthsPx: number[] = [];
  for (const decl of collectDeclarations(allCss, /border(?:-\w+)?/)) {
    const px = decl.match(/([\d.]+)px/)?.[1];
    if (px && !decl.includes("radius")) borderWidthsPx.push(parseFloat(px));
  }

  const fontFamilies = collectDeclarations(allCss, /font-family/);

  const fontWeights: number[] = [];
  for (const decl of collectDeclarations(allCss, /font-weight/)) {
    const kw: Record<string, number> = { normal: 400, bold: 700, bolder: 700, lighter: 300 };
    const num = parseNumber(decl);
    if (num !== null && num >= 100 && num <= 900) fontWeights.push(num);
    else if (kw[decl.trim()]) fontWeights.push(kw[decl.trim()]);
  }

  const letterSpacingsEm: number[] = [];
  for (const decl of collectDeclarations(allCss, /letter-spacing/)) {
    if (decl.includes("em")) letterSpacingsEm.push(parseNumber(decl) ?? 0);
    else if (decl.includes("px")) letterSpacingsEm.push((parseNumber(decl) ?? 0) / 16);
  }

  const paddingsPx: number[] = [];
  for (const decl of collectDeclarations(allCss, /padding(?:-\w+)?/)) {
    const px = parseNumber(decl);
    if (px !== null && decl.includes("px")) paddingsPx.push(px);
  }

  const gapsPx: number[] = [];
  for (const decl of collectDeclarations(allCss, /gap/)) {
    const px = parseNumber(decl);
    if (px !== null && decl.includes("px")) gapsPx.push(px);
  }

  const shadowCount = (allCss.match(/box-shadow\s*:\s*(?!none)/gi) ?? []).length;
  const gradientCount = (allCss.match(/(linear|radial|conic)-gradient\(/gi) ?? []).length;
  const blurCount = (allCss.match(/(backdrop-filter|filter)\s*:\s*[^;]*blur/gi) ?? []).length;
  const uppercaseCount = (allCss.match(/text-transform\s*:\s*uppercase/gi) ?? []).length;
  const motionCount =
    (allCss.match(/\btransition\s*:/gi) ?? []).length +
    (allCss.match(/\banimation\s*:/gi) ?? []).length * 2 +
    (allCss.match(/@keyframes/gi) ?? []).length * 2;
  const textureHintCount =
    (allCss.match(/noise|grain|texture/gi) ?? []).length + (allCss.match(/mix-blend-mode/gi) ?? []).length;
  const declarationCount = (allCss.match(/;/g) ?? []).length;

  return {
    url: pageUrl,
    hostname: url.hostname.replace(/^www\./, ""),
    title,
    description,
    bgColors,
    textColors,
    tokenColors,
    radiiPx,
    borderWidthsPx,
    fontFamilies,
    fontWeights,
    letterSpacingsEm,
    paddingsPx,
    gapsPx,
    shadowCount,
    gradientCount,
    blurCount,
    uppercaseCount,
    motionCount,
    textureHintCount,
    declarationCount,
  };
}
