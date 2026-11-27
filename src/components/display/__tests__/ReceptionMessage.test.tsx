import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ReceptionMessage from '../ReceptionMessage';

describe('ReceptionMessage', () => {
  it('muestra solo el mensaje de recepcion', () => {
    render(<ReceptionMessage />);

    expect(screen.getByText('Acercate a entregar tus juegos con tu QR en mano')).toBeInTheDocument();
    expect(screen.queryByText(/En espera/)).not.toBeInTheDocument();
  });
});
