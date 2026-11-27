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

const FIXED_MESSAGE = 'Tené a mano tu QR y acercate a retirar tus juegos cuando veas tu nombre';

const TIME_NOTICE = 'Tenés 5 minutos para acercarte. Si no llegás a tiempo, pasás al final de la fila.';

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

  it('centers each called name', () => {
    render(<CallQueue calling={[person(1, 'lucia', 'perez'), person(2, 'Ana', 'Gomez')]} waiting={0} />);
    expect(screen.getByText('Lucia Perez').closest('li')).toHaveClass('text-center');
    expect(screen.getByText('Ana Gomez').closest('li')).toHaveClass('text-center');
  });

  it('shows receiving users in blue with the receiving icon and the others in green', () => {
    const receiving = { ...person(1, 'lucia', 'perez'), status: 'receiving' as const };
    const present = person(2, 'Ana', 'Gomez');
    render(<CallQueue calling={[receiving, present]} waiting={0} />);
    const blue = screen.getByText('Lucia Perez').closest('li');
    const green = screen.getByText('Ana Gomez').closest('li');
    expect(blue).toHaveClass('border-primary', 'bg-primary/10', 'text-center');
    expect(blue).not.toHaveClass('border-want');
    expect(blue?.querySelector('svg.lucide-refresh-cw')).toBeInTheDocument();
    expect(green).toHaveClass('border-want', 'bg-want/10');
    expect(green?.querySelector('svg')).not.toBeInTheDocument();
  });

  it('shows a warning icon only for no_show users, keeping the present style', () => {
    const noShow = { ...person(1, 'lucia', 'perez'), status: 'no_show' as const };
    const present = person(2, 'Ana', 'Gomez');
    render(<CallQueue calling={[noShow, present]} waiting={0} />);
    const warned = screen.getByText('Lucia Perez').closest('li');
    const plain = screen.getByText('Ana Gomez').closest('li');
    const icon = warned?.querySelector('svg.lucide-triangle-alert');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('fill-sun', 'text-ink');
    expect(warned?.querySelector('svg.lucide-user-x')).not.toBeInTheDocument();
    expect(warned).toHaveClass('border-want', 'bg-want/10', 'text-center');
    expect(warned?.querySelector('svg.lucide-refresh-cw')).not.toBeInTheDocument();
    expect(plain?.querySelector('svg')).not.toBeInTheDocument();
  });

  it('shows the 5 minutes notice between the fixed message and the called list, highlighted and in bold', () => {
    render(<CallQueue calling={[person(1, 'lucia', 'perez')]} waiting={0} />);
    const notice = screen.getByText(TIME_NOTICE);
    expect(notice).toHaveClass('font-bold', 'text-ink', 'text-center', 'text-3xl');
    const box = notice.closest('div');
    expect(box).toHaveClass('border-sun', 'bg-sun/20');
    expect(box?.querySelector('svg.lucide-triangle-alert')).toHaveClass('fill-sun', 'text-ink');
    const fixed = screen.getByText(FIXED_MESSAGE);
    const heading = screen.getByRole('heading', { level: 2, name: 'Pasan ahora' });
    expect(fixed.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notice.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the 5 minutes notice even when the queue is empty', () => {
    render(<CallQueue calling={[]} waiting={0} />);
    expect(screen.getByText(TIME_NOTICE)).toBeInTheDocument();
  });

  it('gives the Pasan ahora heading a large bold section title style', () => {
    render(<CallQueue calling={[person(1, 'lucia', 'perez')]} waiting={0} />);
    const heading = screen.getByRole('heading', { level: 2, name: 'Pasan ahora' });
    expect(heading).toHaveClass('text-3xl', 'md:text-4xl', 'font-bold', 'text-ink', 'text-center', 'mt-2');
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
