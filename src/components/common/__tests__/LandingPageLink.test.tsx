
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LandingPageLink from '../LandingPageLink';

describe('LandingPageLink', () => {
  const defaultProps = {
    href: '/test-path',
    icon: <svg data-testid="test-icon" />,
    title: 'Test Title',
    description: 'Test Description',
  };

  it('renders correctly with the provided props', () => {
    render(<LandingPageLink {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/test-path');
  });

  it('is disabled when the disabled prop is true', () => {
    render(<LandingPageLink {...defaultProps} disabled />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '#');
    expect(link.firstChild).toHaveClass('cursor-not-allowed');
  });

  it('shows the disabledText when disabled', () => {
    render(<LandingPageLink {...defaultProps} disabled disabledText="Coming Soon" />);

    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
  });

  it('prevents the default click behavior when disabled', () => {
    const { container } = render(<LandingPageLink {...defaultProps} disabled />);
    const link = container.firstChild as HTMLElement;

    const preventDefault = jest.fn();
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(clickEvent, 'preventDefault', { value: preventDefault });
    fireEvent(link, clickEvent);
    expect(preventDefault).toHaveBeenCalled();
  });
});
