import fs from 'fs';
import path from 'path';

const uiDir = path.resolve(__dirname, '..');

describe('common/ui barrel', () => {
  it('has exactly one index file', () => {
    const indexFiles = fs
      .readdirSync(uiDir)
      .filter((name) => /^index\.(ts|tsx|js|jsx)$/.test(name));
    expect(indexFiles).toEqual(['index.ts']);
  });

  it('exports Switch', () => {
    const source = fs.readFileSync(path.join(uiDir, 'index.ts'), 'utf8');
    expect(source).toMatch(/export \{ Switch \} from '\.\/Switch'/);
  });
});
