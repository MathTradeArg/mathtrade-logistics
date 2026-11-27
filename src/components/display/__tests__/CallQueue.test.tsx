import type { UserWithWindow } from '@/types/window';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CallQueue from '../CallQueue';

const person = (id: number, first: string, last: string): UserWithWindow => ({
  id,
  first_name: first,
  last_name: last,
  username: `user${id}`,
  roles: [],
  status: 'present',
  table_number: '7',
});

const FIXED_MESSAGE = 'Tené a mano tu QR y acercate a la boca cuando veas tu nombre';

describe('CallQueue', () => {
  it('shows the fixed message', () => {
    render(<CallQueue calling={[person(1, 'lucia', 'perez')]} waiting={0} />);
    expect(screen.getByText(FIXED_MESSAGE)).toBeInTheDocument();
  });

  it('lists who is called with capitalized first and last name and nothing else', () => {
    render(<CallQueue calling={[person(1, 'lucia', 'perez'), person(2, 'BRUNO', 'DE LA TORRE')]} waiting={0} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Pasan ahora' })).toBeInTheDocument();
    expect(screen.getByText('Lucia Perez')).toBeInTheDocument();
    expect(screen.getByText('Bruno De La Torre')).toBeInTheDocument();
    expect(screen.queryByText('user1')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mesa/)).not.toBeInTheDocument();
  });

  it('shows the number waiting', () => {
    render(<CallQueue calling={[person(1, 'Ana', 'Gomez')]} waiting={5} />);
    expect(screen.getByText('En espera: 5')).toBeInTheDocument();
  });

  it('hides the waiting line when nobody waits', () => {
    render(<CallQueue calling={[person(1, 'Ana', 'Gomez')]} waiting={0} />);
    expect(screen.queryByText(/En espera/)).not.toBeInTheDocument();
  });

  it('shows the empty message and neither section when the queue is empty', () => {
    render(<CallQueue calling={[]} waiting={0} />);
    expect(screen.getByText('No hay nadie en la fila en este momento.')).toBeInTheDocument();
    expect(screen.queryByText('Pasan ahora')).not.toBeInTheDocument();
    expect(screen.queryByText(/En espera/)).not.toBeInTheDocument();
  });
});
