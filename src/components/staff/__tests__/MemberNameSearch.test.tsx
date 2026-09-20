import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});
