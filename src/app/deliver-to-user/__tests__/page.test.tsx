import { redirect } from 'next/navigation';
import DeliverToUserPage from '../page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('DeliverToUserPage', () => {
  it('redirects to /deliver', () => {
    DeliverToUserPage();
    expect(redirect).toHaveBeenCalledWith('/deliver');
  });
});
