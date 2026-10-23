import { parse, type Font, type Glyph, type PathCommand } from 'opentype.js';

/** Glyph outline in em units, y down, origin at the left end of the baseline. */
export type EmOutline = readonly PathCommand[];

/** A label converted to glyphs: outlines plus advances in em (kerning to the next glyph folded in). */
export interface ShapedText {
  readonly outlines: readonly EmOutline[];
  readonly advancesEm: readonly number[];
}

/** The vertical font metrics needed to center text on a line, in font units. */
export interface VerticalMetrics {
  readonly unitsPerEm: number;
  readonly ascender: number;
  readonly descender: number;
  /** From the OS/2 table; absent in old fonts. */
  readonly capHeight: number | undefined;
}

/**
 * Distance from the baseline up to the visual middle of the text, in em. Half the cap height centers
 * capitals and lowercase alike; fonts without it fall back to the middle of the ascender/descender box.
 */
export function verticalCenterEm(metrics: VerticalMetrics): number {
  const middle = metrics.capHeight === undefined ? (metrics.ascender + metrics.descender) / 2 : metrics.capHeight / 2;
  return middle / metrics.unitsPerEm;
}

/** Outline size passed to opentype.js so commands come out in em units. */
const EM_FONT_SIZE = 1;

/** A parsed font: shapes text into glyph outlines + advances (spec R12, R17). */
export class LoadedFont {
  readonly verticalCenterEm: number;
  // Ceiling: caches grow with the number of distinct labels/glyphs and are never evicted; fine for
  // mindmap-sized data, switch to an LRU if hosts render very large or fast-changing label sets.
  private readonly shapedByText = new Map<string, ShapedText>();
  private readonly outlineByGlyph = new Map<Glyph, EmOutline>();

  constructor(
    private readonly font: Font,
    /** The TTF bytes it was parsed from, e.g. to register the same font for DOM text (inline rename). */
    readonly bytes: ArrayBuffer,
  ) {
    const os2 = font.tables['os2'] as { sCapHeight?: number } | undefined;
    this.verticalCenterEm = verticalCenterEm({
      unitsPerEm: font.unitsPerEm,
      ascender: font.ascender,
      descender: font.descender,
      capHeight: os2?.sCapHeight,
    });
  }

  /** Throws when the bytes are not a font opentype.js can parse. */
  static parse(bytes: ArrayBuffer): LoadedFont {
    return new LoadedFont(parse(bytes), bytes);
  }

  shape(text: string): ShapedText {
    const cached = this.shapedByText.get(text);
    if (cached !== undefined) return cached;
    const glyphs = this.font.stringToGlyphs(text);
    const shaped: ShapedText = {
      outlines: glyphs.map((glyph) => this.outlineOf(glyph)),
      advancesEm: glyphs.map((glyph, i) => {
        const next = glyphs[i + 1];
        const kerning = next === undefined ? 0 : this.font.getKerningValue(glyph, next);
        return ((glyph.advanceWidth ?? 0) + kerning) / this.font.unitsPerEm;
      }),
    };
    this.shapedByText.set(text, shaped);
    return shaped;
  }

  private outlineOf(glyph: Glyph): EmOutline {
    const cached = this.outlineByGlyph.get(glyph);
    if (cached !== undefined) return cached;
    const outline = glyph.getPath(0, 0, EM_FONT_SIZE).commands;
    this.outlineByGlyph.set(glyph, outline);
    return outline;
  }
}
