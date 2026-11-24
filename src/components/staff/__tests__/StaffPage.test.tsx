import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { StaffPage } from '../StaffPage';

jest.mock('@/contexts/EventPhaseContext');

describe('StaffPage is the shared page container and never scrolls sideways', () => {
  it('keeps the 512px column and clips horizontal overflow by default', () => {
    render(<StaffPage>hola</StaffPage>);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('max-w-lg', 'min-w-0', 'overflow-x-clip');
    expect(main).not.toHaveClass('md:max-w-4xl');
  });

  it('widens on desktop with width="wide"', () => {
    render(<StaffPage width="wide">hola</StaffPage>);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('max-w-lg', 'md:max-w-4xl', 'min-w-0', 'overflow-x-clip');
  });

  it('appends the caller classes', () => {
    render(<StaffPage className="pb-24">hola</StaffPage>);
    expect(screen.getByRole('main')).toHaveClass('pb-24');
  });
});
