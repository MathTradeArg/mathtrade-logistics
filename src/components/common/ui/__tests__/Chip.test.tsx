import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Chip } from '../Chip';

describe('Chip', () => {
  it('renders the text with the neutral tone by default', () => {
    render(<Chip>Pendiente</Chip>);
    const chip = screen.getByText('Pendiente');
    expect(chip).toHaveClass('rounded-full', 'text-caption', 'bg-gray-100', 'text-gray-800');
  });

  it('applies the requested tone and extra classes', () => {
    render(<Chip tone="warning" className="mb-4">Solo lectura</Chip>);
    const chip = screen.getByText('Solo lectura');
    expect(chip).toHaveClass('bg-warning/20', 'text-gray-900', 'font-semibold', 'mb-4');
    expect(chip).not.toHaveClass('bg-gray-100');
  });

  it('uses the want ink for the want tone', () => {
    render(<Chip tone="want">Solucionado</Chip>);
    expect(screen.getByText('Solucionado')).toHaveClass('bg-want/10', 'text-want-ink');
  });
});
