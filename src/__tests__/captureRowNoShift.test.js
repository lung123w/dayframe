import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * D5 / the delta scenario *The capture row does not shift the list* is a layout
 * property, so its real evidence is a browser measurement (the verification card
 * re-runs the delta table at 1440/1024/768...). What a unit test can pin is the
 * mechanism the property rests on:
 *
 * 1. Above the single-column breakpoint the row may not wrap. A wrapped row is
 *    taller than the input box it is supposed to be pinned by and the list below
 *    moves — measured +40 px at 1300/1200/1120 and +80 px at
 *    1024/950/880/820/800/769 before this rule existed.
 * 2. Where the row is too narrow to hold the revealed pair *and* the input on one
 *    line, letting the input shrink is not enough (it bottoms out at 26px and the
 *    pair overflows the panel by 32px at 1024 and 287px at 769). The pair leaves
 *    the flow there instead, which keeps the row one line tall and the pair
 *    readable.
 * 3. Below 769px the row keeps `.capture-line`'s inherited `flex-wrap: wrap`: that
 *    is the 420px wrap D5 waives, and at 768px the Today layout is single-column
 *    with a 702px panel, so the row never reaches the wrap.
 *
 * The same measurements are why `position: relative` is scoped to the narrow band
 * rather than declared on the row: on the row it makes Chrome antialias the whole
 * panel's text differently (a 3.44 % panel-wide pixel delta at 1440px with no
 * geometry change), which would churn every wider viewport for nothing.
 */
const CSS_PATH = 'src/components/CaptureLine.css';
const TODAY_CSS_PATH = 'src/components/TodayView.css';

/** The body of the first block whose prelude matches `re`, brace-matched. */
function block(css, re) {
  const m = re.exec(css);
  if (!m) return null;
  const start = css.indexOf('{', m.index);
  let depth = 0;
  for (let i = start; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start + 1, i);
    }
  }
  return null;
}

describe('CaptureLine.css — the row does not wrap at ≥769px and the pair leaves the flow when it cannot fit (design.md D5)', () => {
  const css = readFileSync(CSS_PATH, 'utf8');

  it('declares flex-wrap: nowrap for the row variant inside the ≥769px block', () => {
    const media = block(css, /@media\s*\(min-width:\s*769px\)/);
    expect(media).not.toBeNull();
    expect(media).toMatch(/\.capture-line--row\s*\{[^}]*flex-wrap:\s*nowrap\s*;/);
  });

  it('scopes the no-wrap rule to the row variant, leaving the shell strip wrapping', () => {
    // One declaration in the file, so nothing turns the shell line (the five
    // non-Today views) or the ≤768px row into a single line.
    expect(css.match(/flex-wrap:\s*nowrap\s*;/g)).toHaveLength(1);
    // The shell rule itself still wraps, as it did before the change.
    expect(css).toMatch(/^\.capture-line\s*\{[^}]*flex-wrap:\s*wrap\s*;/m);
  });

  it('keeps the row wrapping below the single-column breakpoint (the 420px waiver)', () => {
    // The one no-wrap declaration lives in the ≥769px block and nowhere else:
    // at ≤768px the row inherits the wrapper's `flex-wrap: wrap`.
    expect(css.slice(0, css.indexOf('@media (min-width: 769px)'))).not.toMatch(/flex-wrap:\s*nowrap/);
  });

  it('lets the revealed pair leave the flow exactly when the row cannot hold it', () => {
    const container = block(css, /@container\s*\(max-width:\s*611px\)/);
    expect(container).not.toBeNull();
    // The pair is positioned out of the row's flow...
    expect(container).toMatch(/\.capture-line--row\s+\.capture-line-cluster\s*\{[^}]*position:\s*absolute\s*;/);
    // ...and the row is its containing block (and so paints above the header it
    // overlaps), while `position: relative` on the row is scoped here alone (see
    // the antialiasing note above).
    expect(container).toMatch(/\.capture-line--row\s*\{[^}]*position:\s*relative\s*;/);
    expect(css.match(/position:\s*relative\s*;/g)).toHaveLength(1);
  });

  it('flattens the pair wrapper whenever the pair is not out of flow', () => {
    // `display: contents` is the default, so the shell strip and every row wide
    // enough to hold the pair lay out exactly as the flat flex row did before.
    expect(css).toMatch(/^\.capture-line-cluster\s*\{[^}]*display:\s*contents\s*;/m);
  });

  it('gives the narrow-row query a container to measure (the Today tasks panel)', () => {
    const todayCss = readFileSync(TODAY_CSS_PATH, 'utf8');
    const panel = block(todayCss, /^\.today-tasks-panel\s*\{/m);
    expect(panel).not.toBeNull();
    expect(panel).toMatch(/container-type:\s*inline-size\s*;/);
  });
});
