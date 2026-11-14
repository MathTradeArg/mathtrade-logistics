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
