import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import AmbaMissingPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');

const mockUseAuth = useAuth as jest.Mock;
const mockUseApi = useApi as jest.Mock;

describe('AmbaMissingPage', () => {
  it('lists AMBA recipients with open missing games', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseApi.mockReturnValue({
      data: [{
        user_id: 7,
        first_name: 'Dario',
        last_name: 'Caballito',
        table_number: '12',
        items: [{
          report_id: 1,
          item_id: 88,
          title: 'Salta caja 1',
          assigned_trade_code: 20040,
          box_id: 392,
          box_number: 16,
          origin_name: 'Salta',
        }],
      }],
      isLoading: false,
      error: null,
      execute: jest.fn(),
    });

    render(<AmbaMissingPage />);

    expect(await screen.findByText('Dario Caballito')).toBeInTheDocument();
    expect(screen.getByText(/Mesa 12/)).toBeInTheDocument();
    expect(screen.getByText(/#20040 · Salta caja 1 · caja #16/)).toBeInTheDocument();
  });
});
