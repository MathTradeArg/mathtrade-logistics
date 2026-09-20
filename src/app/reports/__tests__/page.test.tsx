import { redirect } from 'next/navigation';
import ReportsPage from '../page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('ReportsPage redirect', () => {
  it('redirects to /more/report', () => {
    ReportsPage();
    expect(redirect).toHaveBeenCalledWith('/more/report');
  });
});
