import { render, screen } from '@testing-library/react';
import ReportCard from '../ReportCard';
import { EnrichedReport } from '@/types/index';

jest.mock('@/hooks/useApi', () => ({
  useApi: () => ({ execute: jest.fn(), isLoading: false }),
}));
jest.mock('@/hooks/useHapticClick', () => ({
  useHapticClick: (fn: () => void) => fn,
}));
jest.mock('@/contexts/ActionStatusContext', () => ({
  useActionStatus: () => ({ setSuccess: jest.fn(), setError: jest.fn() }),
}));

const report = {
  id: 108,
  user: { id: 971, first_name: 'Belén', last_name: 'Vilaseco' },
  reported_user: null,
  item: 22833,
  item_title: 'Arkham Horror',
  assigned_trade_code: 0,
  images: null,
  comment: 'No coincide la edición',
  created: '06/10/2026 01:53',
  comments: [],
  itemData: {
    id: 22833,
    title: 'Arkham Horror',
    assigned_trade_code: 0,
    first_name: 'Leo',
    last_name: 'Fleitas',
    whatsapp: '+54 9 11 5555-0000',
    telegram: '@leof',
  },
} as EnrichedReport;

describe('ReportCard', () => {
  it('shows the item owner with WhatsApp and Telegram links', () => {
    render(<ReportCard report={report} onImageClick={jest.fn()} />);
    expect(screen.getByText(/Leo/)).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toHaveAttribute('href', 'https://wa.me/5491155550000');
    expect(screen.getByText('Telegram')).toHaveAttribute('href', 'https://t.me/leof');
  });

  it('omits contact links when the owner has none', () => {
    const noContact = { ...report, itemData: { ...report.itemData!, whatsapp: null, telegram: null } };
    render(<ReportCard report={noContact} onImageClick={jest.fn()} />);
    expect(screen.queryByText('WhatsApp')).toBeNull();
    expect(screen.queryByText('Telegram')).toBeNull();
  });
});
