import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Card, cardClass } from '../Card';

describe('cardClass', () => {
  it('is a plain staff card by default', () => {
    expect(cardClass()).toBe('staff-card');
  });

  it('uses the panel surface with panel', () => {
    expect(cardClass({ panel: true })).toBe('staff-panel');
  });

  it.each([
    ['danger', 'border-danger/40 bg-danger/5'],
    ['selected', 'border-primary bg-primary/10'],
    ['disabled', 'bg-muted opacity-45'],
  ] as const)('adds the %s tone classes', (tone, expected) => {
    expect(cardClass({ tone })).toBe(`staff-card ${expected}`);
  });
});

describe('Card', () => {
  it('renders the requested element with tone and extra classes', () => {
    render(<Card as="section" tone="selected" className="p-5">contenido</Card>);
    const card = screen.getByText('contenido');
    expect(card.tagName).toBe('SECTION');
    expect(card).toHaveClass('staff-card', 'border-primary', 'bg-primary/10', 'p-5');
  });
});
