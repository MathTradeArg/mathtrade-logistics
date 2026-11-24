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

describe('staff.css A4 print sheets', () => {
  it('sizes .print-sheet-a4 for an A4 landscape page', () => {
    const b = block('.print-sheet-a4');
    expect(b).toContain('min-height: 180mm');
    expect(b).toContain('max-height: 186mm');
    expect(b).not.toContain('250mm');
    expect(b).not.toContain('265mm');
  });
});
