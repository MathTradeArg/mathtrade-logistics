import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with a custom message', () => {
    const message = 'Please wait...';
    render(<LoadingSpinner message={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('renders with the default message when no message is provided', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('keeps the loading-spinner test id', () => {
    render(<LoadingSpinner />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders the dice instead of the spinning ring', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelectorAll('[data-dice-face]')).toHaveLength(6);
    expect(container.querySelector('svg')).toBeNull();
  });
});
