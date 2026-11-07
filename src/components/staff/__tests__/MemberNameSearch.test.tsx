import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import MemberNameSearch from '../MemberNameSearch';

fetchMock.enableMocks();

describe('MemberNameSearch', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    localStorage.setItem('authToken', 'fake-token');
  });

  it('does not search when the query is shorter than two characters', async () => {
    render(<MemberNameSearch onSelect={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Buscar socio por nombre'), { target: { value: 'A' } });

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('searches and calls onSelect with the member uuid', async () => {
    const onSelect = jest.fn();
    fetchMock.mockResponseOnce(JSON.stringify([
      { uuid: 'member-uuid-1', first_name: 'Ana', last_name: 'Perez' },
    ]));

    render(<MemberNameSearch onSelect={onSelect} />);
    fireEvent.change(screen.getByLabelText('Buscar socio por nombre'), { target: { value: 'Ana' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ana Perez/ })).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('logistics/members/search/?q=Ana'),
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole('button', { name: /Ana Perez/ }));
    expect(onSelect).toHaveBeenCalledWith({
      uuid: 'member-uuid-1',
      first_name: 'Ana',
      last_name: 'Perez',
    });
  });

  it('MemberNameSearch ignores out-of-order response: only the latest query shows results', async () => {
    jest.useFakeTimers();
    try {
      const pending: Record<string, (body: unknown) => void> = {};
      (global.fetch as jest.Mock).mockImplementation((url: string) =>
        new Promise((resolve) => {
          const q = new URL(url, 'http://x/').searchParams.get('q') as string;
          pending[q] = (body: unknown) =>
            resolve({ ok: true, status: 200, json: async () => body });
        }));

      render(<MemberNameSearch onSelect={jest.fn()} />);
      const input = screen.getByLabelText('Buscar socio por nombre');

      fireEvent.change(input, { target: { value: 'ab' } });
      await act(async () => { await jest.advanceTimersByTimeAsync(250); });
      fireEvent.change(input, { target: { value: 'abc' } });
      await act(async () => { await jest.advanceTimersByTimeAsync(250); });
      expect(Object.keys(pending).sort()).toEqual(['ab', 'abc']);

      await act(async () => {
        pending.abc([{ uuid: 'new', user_id: 2, first_name: 'Abc', last_name: 'Nuevo' }]);
      });
      await act(async () => {
        pending.ab([{ uuid: 'old', user_id: 1, first_name: 'Ab', last_name: 'Viejo' }]);
      });

      expect(screen.getByRole('button', { name: /Abc Nuevo/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Ab Viejo/ })).not.toBeInTheDocument();
      expect(screen.queryByText('Buscando...')).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
