import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CityHomePage from '../page';

jest.mock('@/hooks/useAuth');
const mockUseAuth = useAuth as jest.Mock;

describe('CityHomePage', () => {
  it('shows the city and its sections to a referrer', () => {
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } } });
    render(<CityHomePage />);
    expect(screen.getByRole('heading', { name: 'Mendoza' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Armar cajas/ })).toHaveAttribute('href', '/city/boxes');
    expect(screen.getByRole('link', { name: /Instructivo/ })).toHaveAttribute('href', '/city/instructivo');
    expect(screen.getByRole('link', { name: /Envíos/ })).toHaveAttribute('href', '/city/shipments');
    expect(screen.getByRole('link', { name: /Recibidas/ })).toHaveAttribute('href', '/city/received');
    expect(screen.getByRole('link', { name: /Usuarios/ })).toHaveAttribute('href', '/city/users');
    expect(screen.getByRole('link', { name: /Voluntarios/ })).toHaveAttribute('href', '/city/volunteers');
  });

  it('gives a local volunteer Ejemplares and Usuarios, not Recibidas or Voluntarios', () => {
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'local', city: { id: 7, name: 'Mendoza' } } });
    render(<CityHomePage />);
    expect(screen.getByRole('link', { name: /Armar cajas/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Envíos/ })).toHaveAttribute('href', '/city/shipments');
    expect(screen.getByRole('link', { name: /Usuarios/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Recibidas/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Voluntarios/ })).not.toBeInTheDocument();
  });

  it('says so when the user has no city', () => {
    mockUseAuth.mockReturnValue({ cityAccess: null });
    render(<CityHomePage />);
    expect(screen.getByText('No tenés una ciudad asignada.')).toBeInTheDocument();
  });
});
