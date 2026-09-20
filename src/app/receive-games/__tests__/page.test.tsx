import { redirect } from 'next/navigation';
import ReceiveGamesPage from '../page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('ReceiveGamesPage', () => {
  it('redirects to /receive', () => {
    ReceiveGamesPage();
    expect(redirect).toHaveBeenCalledWith('/receive');
  });
});
