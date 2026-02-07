import type { TokenLayer } from '@/types/audit';

/**
 * Parse a CSS color string (hex, rgb, rgba) into RGBA components.
 */
export function parseColor(
  value: string
): { r: number; g: number; b: number; a: number } | null {
  const trimmed = value.trim().toLowerCase();

  // Hex: #rgb, #rrggbb, #rgba, #rrggbbaa
  const hexMatch = trimmed.match(
    /^#([0-9a-f]{3,8})$/
  );
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: parseInt(hex[3] + hex[3], 16) / 255,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
    return null;
  }

  // rgba(r, g, b, a)
  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([0-9.]+))?\s*\)$/
  );
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  return null;
}

/**
 * Convert sRGB (0-255) to CIELAB color space.
 */
export function rgbToLab(
  r: number,
  g: number,
  b: number
): { L: number; a: number; b: number } {
  // Normalize sRGB to [0, 1]
  let rLinear = r / 255;
  let gLinear = g / 255;
  let bLinear = b / 255;

  // Linearize (inverse sRGB companding)
  rLinear =
    rLinear > 0.04045
      ? Math.pow((rLinear + 0.055) / 1.055, 2.4)
      : rLinear / 12.92;
  gLinear =
    gLinear > 0.04045
      ? Math.pow((gLinear + 0.055) / 1.055, 2.4)
      : gLinear / 12.92;
  bLinear =
    bLinear > 0.04045
      ? Math.pow((bLinear + 0.055) / 1.055, 2.4)
      : bLinear / 12.92;

  // Convert to XYZ (D65 illuminant)
  let x = rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375;
  let y = rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.0721750;
  let z = rLinear * 0.0193339 + gLinear * 0.1191920 + bLinear * 0.9503041;

  // Normalize by D65 white point
  x /= 0.95047;
  y /= 1.0;
  z /= 1.08883;

  // CIE Lab conversion
  const epsilon = 0.008856;
  const kappa = 903.3;

  const fx =
    x > epsilon ? Math.pow(x, 1 / 3) : (kappa * x + 16) / 116;
  const fy =
    y > epsilon ? Math.pow(y, 1 / 3) : (kappa * y + 16) / 116;
  const fz =
    z > epsilon ? Math.pow(z, 1 / 3) : (kappa * z + 16) / 116;

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return { L, a, b: bVal };
}

/**
 * Euclidean distance in CIELAB space, normalized to 0-1.
 * Max possible distance is approximately 375 (black to white through full chroma).
 * Returns 1 if either color cannot be parsed.
 */
export function colorDistanceLab(color1: string, color2: string): number {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  if (!c1 || !c2) return 1;

  const lab1 = rgbToLab(c1.r, c1.g, c1.b);
  const lab2 = rgbToLab(c2.r, c2.g, c2.b);

  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;

  const distance = Math.sqrt(dL * dL + da * da + db * db);

  return Math.min(1, distance / 375);
}

/**
 * CIEDE2000 color difference, normalized to 0-1.
 * Full implementation of the CIEDE2000 formula (CIE Technical Report 142-2001).
 * Returns 1 if either color cannot be parsed.
 */
export function colorDistanceCIEDE2000(color1: string, color2: string): number {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  if (!c1 || !c2) return 1;

  const lab1 = rgbToLab(c1.r, c1.g, c1.b);
  const lab2 = rgbToLab(c2.r, c2.g, c2.b);

  const dE = ciede2000(lab1, lab2);

  // Normalize: CIEDE2000 values typically range 0-100 for most practical cases.
  // A value of 100 represents an extreme difference.
  return Math.min(1, dE / 100);
}

/**
 * Full CIEDE2000 implementation.
 * Parametric weighting factors kL, kC, kH are all set to 1 (reference conditions).
 */
function ciede2000(
  lab1: { L: number; a: number; b: number },
  lab2: { L: number; a: number; b: number }
): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const kL = 1;
  const kC = 1;
  const kH = 1;

  // Step 1: Calculate C'ab, h'ab
  const C1ab = Math.sqrt(a1 * a1 + b1 * b1);
  const C2ab = Math.sqrt(a2 * a2 + b2 * b2);
  const CabMean = (C1ab + C2ab) / 2;

  const CabMean7 = Math.pow(CabMean, 7);
  const G = 0.5 * (1 - Math.sqrt(CabMean7 / (CabMean7 + Math.pow(25, 7))));

  const a1Prime = a1 * (1 + G);
  const a2Prime = a2 * (1 + G);

  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

  let h1Prime = Math.atan2(b1, a1Prime) * (180 / Math.PI);
  if (h1Prime < 0) h1Prime += 360;

  let h2Prime = Math.atan2(b2, a2Prime) * (180 / Math.PI);
  if (h2Prime < 0) h2Prime += 360;

  // Step 2: Calculate delta values
  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;

  let deltahPrime: number;
  if (C1Prime * C2Prime === 0) {
    deltahPrime = 0;
  } else if (Math.abs(h2Prime - h1Prime) <= 180) {
    deltahPrime = h2Prime - h1Prime;
  } else if (h2Prime - h1Prime > 180) {
    deltahPrime = h2Prime - h1Prime - 360;
  } else {
    deltahPrime = h2Prime - h1Prime + 360;
  }

  const deltaHPrime =
    2 *
    Math.sqrt(C1Prime * C2Prime) *
    Math.sin((deltahPrime * Math.PI) / 360);

  // Step 3: Calculate CIEDE2000
  const LPrimeMean = (L1 + L2) / 2;
  const CPrimeMean = (C1Prime + C2Prime) / 2;

  let hPrimeMean: number;
  if (C1Prime * C2Prime === 0) {
    hPrimeMean = h1Prime + h2Prime;
  } else if (Math.abs(h1Prime - h2Prime) <= 180) {
    hPrimeMean = (h1Prime + h2Prime) / 2;
  } else if (h1Prime + h2Prime < 360) {
    hPrimeMean = (h1Prime + h2Prime + 360) / 2;
  } else {
    hPrimeMean = (h1Prime + h2Prime - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(((hPrimeMean - 30) * Math.PI) / 180) +
    0.24 * Math.cos(((2 * hPrimeMean) * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hPrimeMean + 6) * Math.PI) / 180) -
    0.20 * Math.cos(((4 * hPrimeMean - 63) * Math.PI) / 180);

  const LPrimeMeanMinus50Sq = (LPrimeMean - 50) * (LPrimeMean - 50);
  const SL =
    1 + 0.015 * LPrimeMeanMinus50Sq / Math.sqrt(20 + LPrimeMeanMinus50Sq);
  const SC = 1 + 0.045 * CPrimeMean;
  const SH = 1 + 0.015 * CPrimeMean * T;

  const CPrimeMean7 = Math.pow(CPrimeMean, 7);
  const RC = 2 * Math.sqrt(CPrimeMean7 / (CPrimeMean7 + Math.pow(25, 7)));

  const deltaTheta =
    30 * Math.exp(-Math.pow((hPrimeMean - 275) / 25, 2));
  const RT = -Math.sin((2 * deltaTheta * Math.PI) / 180) * RC;

  const dLRatio = deltaLPrime / (kL * SL);
  const dCRatio = deltaCPrime / (kC * SC);
  const dHRatio = deltaHPrime / (kH * SH);

  const dE = Math.sqrt(
    dLRatio * dLRatio +
      dCRatio * dCRatio +
      dHRatio * dHRatio +
      RT * dCRatio * dHRatio
  );

  return dE;
}

/**
 * Numeric distance between two CSS value strings (px, rem, em, %).
 * Returns a value between 0 and 1.
 * Returns 1 if either value cannot be parsed as a number.
 */
export function numericDistance(a: string, b: string): number {
  const numA = parseNumericValue(a);
  const numB = parseNumericValue(b);

  if (numA === null || numB === null) return 1;
  if (numA === 0 && numB === 0) return 0;

  const maxVal = Math.max(Math.abs(numA), Math.abs(numB));
  return Math.min(1, Math.abs(numA - numB) / maxVal);
}

/**
 * Parse a CSS numeric value, stripping units (px, rem, em, %).
 */
function parseNumericValue(value: string): number | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(?:px|rem|em|%|s|ms|deg)?$/);
  if (!match) return null;
  return parseFloat(match[1]);
}

/**
 * Font family distance. Exact match = 0, else 1.
 * Normalizes by lowercasing and stripping surrounding quotes.
 */
export function fontFamilyDistance(a: string, b: string): number {
  const normalize = (v: string) =>
    v
      .trim()
      .toLowerCase()
      .replace(/^["']|["']$/g, '');

  return normalize(a) === normalize(b) ? 0 : 1;
}

/**
 * Dispatch to the correct distance function based on token layer and property.
 */
export function tokenDistance(
  layer: TokenLayer,
  property: string,
  value1: string,
  value2: string
): number {
  if (value1 === value2) return 0;

  switch (layer) {
    case 'color':
      return colorDistanceCIEDE2000(value1, value2);

    case 'typography':
      if (property === 'fontFamily') {
        return fontFamilyDistance(value1, value2);
      }
      return numericDistance(value1, value2);

    case 'spacing':
    case 'elevation':
    case 'border':
    case 'motion':
    case 'opacity':
      return numericDistance(value1, value2);

    default:
      return value1 === value2 ? 0 : 1;
  }
}
