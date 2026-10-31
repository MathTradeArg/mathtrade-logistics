import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import StaffChrome from '../StaffChrome';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));
jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/contexts/ActionStatusContext');
jest.mock('@/components/common/AppHeader', () => function AppHeader() { return <header />; });
jest.mock('@/components/staff/BottomNav', () => function BottomNav() { return <nav />; });

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUseActionStatus = useActionStatus as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;

const auth = (overrides: Record<string, unknown>) => ({
  isAuthenticated: true,
  isLoading: false,
  userName: 'Ana',
  isAdmin: false,
  role: null,
  roleNotice: null,
  clearRoleNotice: jest.fn(),
  ...overrides,
});

describe('StaffChrome role guard', () => {
  const setSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockUseActionStatus.mockReturnValue({ setSuccess });
  });

  it('sends a volunteer without a role to /select-role', () => {
    mockUseAuth.mockReturnValue(auth({ role: null }));
    mockUsePathname.mockReturnValue('/more');
    render(<StaffChrome><p>page</p></StaffChrome>);
    expect(mockReplace).toHaveBeenCalledWith('/select-role');
  });

  it('does not redirect a volunteer without a role who is already on /select-role', () => {
    mockUseAuth.mockReturnValue(auth({ role: null }));
    mockUsePathname.mockReturnValue('/select-role');
    render(<StaffChrome><p>page</p></StaffChrome>);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sends boxes on /receive to /boxes/in in phase 1', () => {
    mockUseAuth.mockReturnValue(auth({ role: 'boxes' }));
    mockUsePathname.mockReturnValue('/receive');
    render(<StaffChrome><p>page</p></StaffChrome>);
    expect(mockReplace).toHaveBeenCalledWith('/boxes/in');
  });

  it('leaves a volunteer on an allowed page, and moves them off /select-role', () => {
    mockUseAuth.mockReturnValue(auth({ role: 'boxes' }));
    mockUsePathname.mockReturnValue('/more/tools');
    const { rerender } = render(<StaffChrome><p>page</p></StaffChrome>);
    expect(mockReplace).not.toHaveBeenCalled();

    mockUsePathname.mockReturnValue('/select-role');
    rerender(<StaffChrome><p>page</p></StaffChrome>);
    expect(mockReplace).toHaveBeenCalledWith('/boxes/in');
  });

  it('never redirects an admin', () => {
    mockUseAuth.mockReturnValue(auth({ isAdmin: true, role: null }));
    for (const path of ['/receive', '/boxes/out/3', '/admin/volunteers', '/more']) {
      mockUsePathname.mockReturnValue(path);
      render(<StaffChrome><p>page</p></StaffChrome>);
    }
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('waits for auth and the phase, and skips bare pages', () => {
    mockUseAuth.mockReturnValue(auth({ isLoading: true }));
    render(<StaffChrome><p>page</p></StaffChrome>);
    mockUseAuth.mockReturnValue(auth({}));
    mockUseEventPhase.mockReturnValue({ eventPhase: null, isLoadingEventPhase: true });
    render(<StaffChrome><p>page</p></StaffChrome>);
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockUsePathname.mockReturnValue('/display/ready-to-pickup');
    render(<StaffChrome><p>page</p></StaffChrome>);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows a roleNotice as a success toast and clears it', () => {
    const clearRoleNotice = jest.fn();
    mockUseAuth.mockReturnValue(auth({
      role: 'window', roleNotice: 'Un admin cambió tu rol a Ventanilla.', clearRoleNotice,
    }));
    render(<StaffChrome><p>page</p></StaffChrome>);
    expect(setSuccess).toHaveBeenCalledWith('Un admin cambió tu rol a Ventanilla.');
    expect(clearRoleNotice).toHaveBeenCalled();
  });
});
