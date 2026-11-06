import { listItems } from '../boxApi';

describe('listItems', () => {
  const fetchMock = global.fetch as jest.Mock;
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
  });
  const urlOf = () => fetchMock.mock.calls[0][0] as string;

  it('sends include_send_as=1 only when asked', async () => {
    await listItems({ origin: 7, includeSendAs: true });
    expect(urlOf()).toContain('logistics/items/?origin=7&include_send_as=1');
  });

  it('leaves the query unchanged without the option', async () => {
    await listItems({ origin: 7 });
    expect(urlOf()).toMatch(/logistics\/items\/\?origin=7$/);
    fetchMock.mockClear();
    await listItems({ origin: 7, includeSendAs: false });
    expect(urlOf()).not.toContain('include_send_as');
  });
});
