import { useEventPhase } from '@/contexts/EventPhaseContext';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import BottomNav from '../BottomNav';

jest.mock('@/contexts/EventPhaseContext');
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;

describe('BottomNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
  });

  it('shows receive / arrive / pack / more in phase 1', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 1 });
    render(<BottomNav />);

    expect(screen.getByRole('link', { name: 'Recibir' })).toHaveAttribute('href', '/receive');
    expect(screen.getByRole('link', { name: 'Llegan' })).toHaveAttribute('href', '/boxes/in');
    expect(screen.getByRole('link', { name: 'Empacar' })).toHaveAttribute('href', '/boxes/out');
    expect(screen.getByRole('link', { name: 'Más' })).toHaveAttribute('href', '/more');
    expect(screen.queryByRole('link', { name: 'Entregar' })).not.toBeInTheDocument();
  });

  it('shows deliver / receive / pack / more in phase 2', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 2 });
    render(<BottomNav />);

    expect(screen.getByRole('link', { name: 'Entregar' })).toHaveAttribute('href', '/deliver');
    expect(screen.getByRole('link', { name: 'Recibir' })).toHaveAttribute('href', '/receive');
    expect(screen.getByRole('link', { name: 'Empacar' })).toHaveAttribute('href', '/boxes/out');
    expect(screen.getByRole('link', { name: 'Más' })).toHaveAttribute('href', '/more');
    expect(screen.queryByRole('link', { name: 'Llegan' })).not.toBeInTheDocument();
  });

  it('disables day slots in phase 0 and keeps Más', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 0 });
    render(<BottomNav />);

    expect(screen.queryByRole('link', { name: 'Recibir' })).not.toBeInTheDocument();
    expect(screen.getByText('Recibir').closest('[aria-disabled="true"]')).toBeInTheDocument();
    expect(screen.getByText('Llegan').closest('[aria-disabled="true"]')).toBeInTheDocument();
    expect(screen.getByText('Empacar').closest('[aria-disabled="true"]')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Más' })).toHaveAttribute('href', '/more');
  });

  it('marks Recibir as current on /receive-games', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 1 });
    mockUsePathname.mockReturnValue('/receive-games');
    render(<BottomNav />);

    expect(screen.getByRole('link', { name: 'Recibir' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Llegan' })).not.toHaveAttribute('aria-current');
  });
});
