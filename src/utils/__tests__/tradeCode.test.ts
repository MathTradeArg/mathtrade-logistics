import { formatTradeCode, parseTradeCodeQuery, tradeCodeSearchText } from '@/utils/tradeCode';

describe('formatTradeCode', () => {
  it('pads to 5 digits and keeps longer codes', () => {
    expect(formatTradeCode(10)).toBe('00010');
    expect(formatTradeCode('345')).toBe('00345');
    expect(formatTradeCode(16120)).toBe('16120');
    expect(formatTradeCode(null)).toBe('—');
  });
});

describe('tradeCodeSearchText', () => {
  it('matches the label with or without leading zeros', () => {
    const text = tradeCodeSearchText(10);
    expect(text.includes('00010')).toBe(true);
    expect(text.includes('10')).toBe(true);
    expect(text.includes('010')).toBe(true);
    expect(tradeCodeSearchText(16120)).toBe('16120');
  });
});

describe('parseTradeCodeQuery', () => {
  it('drops a leading hash and leading zeros', () => {
    expect(parseTradeCodeQuery('  #0010 ')).toBe('10');
    expect(parseTradeCodeQuery('16120')).toBe('16120');
    expect(parseTradeCodeQuery('catan')).toBeNull();
    expect(parseTradeCodeQuery('')).toBeNull();
  });
});
