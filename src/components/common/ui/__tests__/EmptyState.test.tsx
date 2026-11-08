import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Package } from 'phosphor-react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders only the message without icon or CTA', () => {
    const { container } = render(<EmptyState message="No hay juegos." />);
    const message = screen.getByText('No hay juegos.');
    expect(message.tagName).toBe('P');
    expect(message).toHaveClass('py-8', 'text-center', 'text-body');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders the icon and the CTA link', () => {
    const { container } = render(
      <EmptyState icon={Package} message="La caja está vacía." ctaText="Ir a Más" ctaHref="/more" />,
    );
    expect(screen.getByText('La caja está vacía.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Ir a Más' });
    expect(link).toHaveAttribute('href', '/more');
    expect(link).toHaveClass('staff-btn', 'staff-btn-primary');
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
