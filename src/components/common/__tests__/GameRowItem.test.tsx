import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameRowItem from '@/components/common/GameRowItem';

describe('GameRowItem', () => {
  const defaultProps = {
    id: 123,
    title: 'Catan',
    onRowClick: jest.fn(),
    onCheckboxChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and ID', () => {
    render(<GameRowItem {...defaultProps} />);
    expect(screen.getByText('Catan')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('renders a checkbox when showCheckbox is true', () => {
    render(<GameRowItem {...defaultProps} showCheckbox={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('renders a checked checkbox when isSelected is true', () => {
    render(<GameRowItem {...defaultProps} showCheckbox={true} isSelected={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onCheckboxChange when checkbox is clicked', () => {
    render(<GameRowItem {...defaultProps} showCheckbox={true} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(defaultProps.onCheckboxChange).toHaveBeenCalledTimes(1);
  });

  it('renders delivered variant correctly', () => {
    render(<GameRowItem {...defaultProps} variant="delivered" />);
    const title = screen.getByText('Catan');
    expect(title).toHaveClass('line-through');
    const iconContainer = title.closest('li')?.querySelector('.bg-green-500');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders pendingOther variant correctly', () => {
    render(<GameRowItem {...defaultProps} variant="pendingOther" />);
    const title = screen.getByText('Catan');
    expect(title).toHaveClass('line-through');
    const iconContainer = title.closest('li')?.querySelector('.bg-red-500');
    expect(iconContainer).toBeInTheDocument();
  });

  it('calls onRowClick when an actionable item is clicked', () => {
    render(<GameRowItem {...defaultProps} variant="actionable" />);
    fireEvent.click(screen.getByRole('listitem'));
    expect(defaultProps.onRowClick).toHaveBeenCalledTimes(1);
  });
});