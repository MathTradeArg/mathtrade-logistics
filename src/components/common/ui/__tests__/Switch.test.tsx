import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Switch } from '../Switch';

describe('Switch', () => {
  it('renders in an unchecked state', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  it('renders in a checked state', () => {
    render(<Switch checked={true} onCheckedChange={() => {}} />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onCheckedChange with the new value when clicked', () => {
    const handleCheckedChange = jest.fn();
    render(<Switch checked={false} onCheckedChange={handleCheckedChange} />);
    
    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);
    
    expect(handleCheckedChange).toHaveBeenCalledTimes(1);
    expect(handleCheckedChange).toHaveBeenCalledWith(true);
  });
});