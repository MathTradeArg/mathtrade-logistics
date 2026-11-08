import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ProblemHeader from '../ProblemHeader';

describe('ProblemHeader', () => {
  it('shows the question as h1 and its hint', () => {
    render(<ProblemHeader id="no-show" />);
    expect(screen.getByRole('heading', { level: 2, name: '¿Alguien no vino a retirar?' })).toBeInTheDocument();
    expect(screen.getByText('Mirá quién retiró y marcá a los que no vinieron')).toBeInTheDocument();
  });
});
