import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FullScreenImageModal from '../FullScreenImageModal';

describe('FullScreenImageModal', () => {
  const mockOnClose = jest.fn();
  const imageUrl = 'https://example.com/image.jpg';

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders correctly when an image URL is provided', () => {
    render(<FullScreenImageModal imageUrl={imageUrl} onClose={mockOnClose} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', "/_next/image?url=https%3A%2F%2Fexample.com%2Fimage.jpg&w=3840&q=75");
    expect(screen.getByLabelText('Cerrar imagen')).toBeInTheDocument();
  });

  it('does not render when the image URL is null', () => {
    render(<FullScreenImageModal imageUrl={null} onClose={mockOnClose} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    render(<FullScreenImageModal imageUrl={imageUrl} onClose={mockOnClose} />);
    fireEvent.click(screen.getByLabelText('Cerrar imagen'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the background is clicked', () => {
    render(<FullScreenImageModal imageUrl={imageUrl} onClose={mockOnClose} />);
    const image = screen.getByRole('img');
    const modalBackground = image.parentElement?.parentElement as HTMLElement;
    if (modalBackground) {
      fireEvent.click(modalBackground);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not call onClose when the image itself is clicked', () => {
    render(<FullScreenImageModal imageUrl={imageUrl} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('img'));
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when clicking inside the modal content pero no en el botón de cerrar ni en la imagen', () => {
    render(<FullScreenImageModal imageUrl={imageUrl} onClose={mockOnClose} />);
    const image = screen.getByRole('img');
    const modalContent = image.parentElement as HTMLElement;
    fireEvent.click(modalContent);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('renders the close icon inside the close button', () => {
    render(<FullScreenImageModal imageUrl={imageUrl} onClose={mockOnClose} />);
    const closeButton = screen.getByLabelText('Cerrar imagen');
    expect(closeButton.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with correct classes for modal and content', () => {
    render(<FullScreenImageModal imageUrl={imageUrl} onClose={mockOnClose} />);
    const image = screen.getByRole('img');
    const modalBackground = image.parentElement?.parentElement as HTMLElement;
    expect(modalBackground).toHaveClass('fixed', 'inset-0', 'z-50');
    const modalContent = image.parentElement as HTMLElement;
    expect(modalContent).toHaveClass('relative', 'w-full', 'h-full');
  });
});

