import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import StaffSegmented from '../StaffSegmented';

const options = [
  { id: 'amba', label: 'AMBA' },
  { id: 'transit', label: 'Tránsito' },
] as const;

describe('StaffSegmented', () => {
  it('exposes the active segment with aria-pressed inside a group', () => {
    render(<StaffSegmented value="amba" options={[...options]} onChange={jest.fn()} />);
    expect(screen.getByRole('group')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AMBA' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tránsito' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked segment', () => {
    const onChange = jest.fn();
    render(<StaffSegmented value="amba" options={[...options]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tránsito' }));
    expect(onChange).toHaveBeenCalledWith('transit');
  });
});
