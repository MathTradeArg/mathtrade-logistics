import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import StaffDialog from '../StaffDialog';

describe('StaffDialog', () => {
  it('renders the confirm button by default', () => {
    render(<StaffDialog open title="¿Seguro?" confirmLabel="Sí" onConfirm={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Sí' })).toBeInTheDocument();
  });

  it('hides the confirm button with hideConfirm', () => {
    render(
      <StaffDialog open title="¿Seguro?" hideConfirm onCancel={jest.fn()}>
        <p>cuerpo</p>
      </StaffDialog>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByText('cuerpo')).toBeInTheDocument();
  });
});
