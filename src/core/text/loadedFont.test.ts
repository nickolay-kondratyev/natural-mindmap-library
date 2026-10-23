import { vendoredKalamBytes } from '../../../test-support/vendoredKalam';
import { LoadedFont, verticalCenterEm } from './loadedFont';

describe('LoadedFont', () => {
  // GIVEN the vendored Kalam font
  const font = LoadedFont.parse(vendoredKalamBytes());

  it('WHEN shaping a word THEN there is one advance per character', () => {
    expect(font.shape('Hamlet').advancesEm.length).toBe(6);
  });

  it('WHEN shaping a word THEN every glyph has a non-empty outline', () => {
    expect(font.shape('Hamlet').outlines.every((outline) => outline.length > 0)).toBe(true);
  });

  it('WHEN shaping a word THEN advances are positive em fractions', () => {
    expect(font.shape('Hamlet').advancesEm.every((advance) => advance > 0 && advance < 2)).toBe(true);
  });

  it('WHEN bytes are not a font THEN parsing throws', () => {
    expect(() => LoadedFont.parse(new ArrayBuffer(16))).toThrow();
  });
});

describe('verticalCenterEm', () => {
  it('GIVEN a cap height WHEN computing THEN the center is half the cap height in em', () => {
    expect(verticalCenterEm({ unitsPerEm: 1000, ascender: 900, descender: -300, capHeight: 700 })).toBe(0.35);
  });

  it('GIVEN no cap height WHEN computing THEN the center is the middle of ascender and descender', () => {
    expect(verticalCenterEm({ unitsPerEm: 1000, ascender: 900, descender: -300, capHeight: undefined })).toBe(0.3);
  });
});
