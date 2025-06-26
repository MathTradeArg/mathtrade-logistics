import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GlobalControlPanel } from '../GlobalControlPanel';
import { useAuth } from '@/hooks/useAuth';
import { useControlPanel } from '@/contexts/ControlPanelContext';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/ControlPanelContext');

jest.mock('@/components/control-panel/ControlPanelModal', () => {
  const MockControlPanelModal = jest.fn((props) => (
    <div data-testid="mock-control-panel-modal">
      <div data-testid="is-open-prop">{String(props.isOpen)}</div>
      <div data-testid="is-admin-prop">{String(props.isAdmin)}</div>
    </div>
  ));
  return MockControlPanelModal;
});

const mockUseAuth = useAuth as jest.Mock;
const mockUseControlPanel = useControlPanel as jest.Mock;

describe('GlobalControlPanel', () => {
  const mockClosePanel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes correct props to ControlPanelModal when user is an admin and panel is open', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUseControlPanel.mockReturnValue({
      isPanelOpen: true,
      closePanel: mockClosePanel,
    });

    render(<GlobalControlPanel />);

    expect(screen.getByTestId('mock-control-panel-modal')).toBeInTheDocument();
    expect(screen.getByTestId('is-open-prop')).toHaveTextContent('true');
    expect(screen.getByTestId('is-admin-prop')).toHaveTextContent('true');
  });

  it('passes correct props to ControlPanelModal when user is not an admin and panel is closed', () => {
    mockUseAuth.mockReturnValue({ isAdmin: false });
    mockUseControlPanel.mockReturnValue({
      isPanelOpen: false,
      closePanel: mockClosePanel,
    });

    render(<GlobalControlPanel />);

    expect(screen.getByTestId('mock-control-panel-modal')).toBeInTheDocument();
    expect(screen.getByTestId('is-open-prop')).toHaveTextContent('false');
    expect(screen.getByTestId('is-admin-prop')).toHaveTextContent('false');
  });
});

