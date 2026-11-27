import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '..', 'staff.css'), 'utf8');
const block = (selector: string) => {
  const m = css.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : '';
};

describe('staff.css buttons', () => {
  it('primary uses the brand colour with ink text', () => {
    const b = block('.staff-btn-primary');
    expect(b).toContain('var(--color-brand)');
    expect(b).toContain('var(--color-brand-ink)');
  });
  it('outline uses ink for border and text', () => {
    const b = block('.staff-btn-outline');
    expect(b).toContain('var(--color-ink)');
  });
});

describe('globals.css scrollbar', () => {
  const globals = readFileSync(join(__dirname, '..', '..', 'app', 'globals.css'), 'utf8');
  const coarse = globals.match(/@media \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/);

  it('hides the scrollbar only on touch screens (pointer: coarse)', () => {
    expect(coarse).not.toBeNull();
    expect(coarse![1]).toContain('::-webkit-scrollbar');
    expect(coarse![1]).toContain('scrollbar-width: none');
  });

  it('does not hide it outside that media query (mouse/notebook)', () => {
    const outside = globals.replace(coarse ? coarse[0] : '', '');
    expect(outside).not.toContain('::-webkit-scrollbar');
    expect(outside).not.toContain('scrollbar-width: none');
  });
});

describe('staff.css print container', () => {
  it('undoes StaffPage overflow-x-clip when printing so no sheet is cut', () => {
    expect(block('.print-container')).toContain('overflow: visible !important');
  });
});

describe('staff.css A4 print sheets', () => {
  it('sizes .print-sheet-a4 for an A4 landscape page', () => {
    const b = block('.print-sheet-a4');
    expect(b).toContain('min-height: 180mm');
    expect(b).toContain('max-height: 186mm');
    expect(b).not.toContain('250mm');
    expect(b).not.toContain('265mm');
  });
});

describe('staff.css A5 print sheets', () => {
  it('sizes .print-sheet-a5 for an A5 landscape page', () => {
    const b = block('.print-sheet-a5');
    expect(b).toContain('height: 134mm');
    expect(b).toContain('break-after: page');
    expect(b).toContain('break-inside: avoid');
  });
});
