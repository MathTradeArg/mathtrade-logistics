import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PreferenceToggle } from '../PreferenceToggle';

describe('PreferenceToggle', () => {
  it('renders the component with correct initial state', () => {
    render(<PreferenceToggle isHighContrast={false} onToggle={() => { }} />);

    expect(screen.getByText('Modo de Alto Contraste')).toBeInTheDocument();
    const switchElement = screen.getByRole('switch', { name: /activar modo de alto contraste/i });
    expect(switchElement).not.toBeChecked();
  });

  it('renders the component with correct initial state when high contrast is enabled', () => {
    render(<PreferenceToggle isHighContrast={true} onToggle={() => { }} />);

    expect(screen.getByText('Modo de Alto Contraste')).toBeInTheDocument();
    const switchElement = screen.getByRole('switch', { name: /activar modo de alto contraste/i });
    expect(switchElement).toBeChecked();
  });

  it('calls onToggle when the switch is clicked', () => {
    const onToggleMock = jest.fn();
    render(<PreferenceToggle isHighContrast={false} onToggle={onToggleMock} />);

    const switchElement = screen.getByRole('switch', { name: /activar modo de alto contraste/i });
    fireEvent.click(switchElement);

    expect(onToggleMock).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle when the switch is clicked and high contrast is initially enabled', () => {
    const onToggleMock = jest.fn();
    render(<PreferenceToggle isHighContrast={true} onToggle={onToggleMock} />);

    const switchElement = screen.getByRole('switch', { name: /activar modo de alto contraste/i });
    fireEvent.click(switchElement);

    expect(onToggleMock).toHaveBeenCalledTimes(1);
  });

  it('has correct aria-label on the switch', () => {
    render(<PreferenceToggle isHighContrast={false} onToggle={() => { }} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-label', 'Activar modo de alto contraste');
  });
});

