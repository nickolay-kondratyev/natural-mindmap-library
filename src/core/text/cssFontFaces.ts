import type { LoadedFont } from './loadedFont';

/** Used while the label font is still loading (or failed), so typing is never blocked on it. */
const FALLBACK_FAMILY = 'cursive';
const FAMILY_PREFIX = 'natural-mindmap-font-';

/**
 * Registers parsed label fonts with the document (`FontFace` from the very same bytes), so DOM text such as the
 * inline rename input (spec I4) shows the real font instead of a look-alike. Each font is registered once.
 */
export class CssFontFaces {
  private readonly families = new WeakMap<LoadedFont, string>();
  private registered = 0;

  constructor(private readonly document: Document) {}

  /** CSS `font-family` value for `font`; the fallback alone when no font is loaded. */
  familyFor(font: LoadedFont | null): string {
    if (font === null) return FALLBACK_FAMILY;
    return `"${this.register(font)}", ${FALLBACK_FAMILY}`;
  }

  private register(font: LoadedFont): string {
    const existing = this.families.get(font);
    if (existing !== undefined) return existing;
    this.registered += 1;
    const family = `${FAMILY_PREFIX}${this.registered}`;
    const face = new FontFace(family, font.bytes);
    this.document.fonts.add(face);
    // Bytes are local, so this settles almost at once; a font the browser cannot use just leaves the fallback.
    face.load().catch((error: unknown) => console.warn('natural-mindmap: label font unusable for inline editing', { error }));
    this.families.set(font, family);
    return family;
  }
}
