import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useCreatedBoxes } from '@/hooks/boxes/useCreatedBoxes';
import { useIncomingBoxes } from '@/hooks/boxes/useIncomingBoxes';
import { useAuth } from '@/hooks/useAuth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import BoxesPage from '../page';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  Suspense: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/AppHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="app-header">AppHeader</div>,
}));
jest.mock('@/components/boxes/AssembleBoxSection', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="assemble-box-section">AssembleBoxSection</div>
  ),
}));
jest.mock('@/components/boxes/CreatedBoxesSection', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="created-boxes-section">CreatedBoxesSection</div>
  ),
}));
jest.mock('@/components/boxes/IncomingBoxesSection', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="incoming-boxes-section">IncomingBoxesSection</div>
  ),
}));

jest.mock('lucide-react', () => {
  const React = require('react');
  return new Proxy(
    {},
    {
      get: (target, name) => {
        const MockIcon = (props: any) => React.createElement('div', props);
        MockIcon.displayName = String(name);
        return MockIcon;
      },
    }
  );
});

jest.mock('@/components/ui', () => {
  const React = require('react');
  const createMockComponent = (
    displayName: string,
    { as: Component = 'div' }: { as?: React.ElementType } = {}
  ) => {
    const MockComponent = React.forwardRef(
      (
        { children, ...props }: { children?: React.ReactNode; [key: string]: any },
        ref: React.Ref<HTMLElement>
      ) => React.createElement(Component, { ...props, ref }, children)
    );
    MockComponent.displayName = displayName;
    return MockComponent;
  };

  return {
    LoadingSpinner: ({ message }: { message: string }) => <div data-testid="loading-spinner">{message}</div>,
    Tabs: createMockComponent('Tabs'),
    TabsList: createMockComponent('TabsList'),
    TabsTrigger: createMockComponent('TabsTrigger', { as: 'button' }),
    TabsContent: createMockComponent('TabsContent'),
    Alert: createMockComponent('Alert'),
    AlertTitle: createMockComponent('AlertTitle'),
    AlertDescription: createMockComponent('AlertDescription'),
  };
});

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/contexts/ActionStatusContext', () => ({
  ActionStatusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useActionStatus: jest.fn(),
}));
jest.mock('@/contexts/EventPhaseContext', () => ({
  useEventPhase: jest.fn(),
}));
jest.mock('@/hooks/boxes/useIncomingBoxes', () => ({
  useIncomingBoxes: jest.fn(),
}));
jest.mock('@/hooks/boxes/useCreatedBoxes', () => ({
  useCreatedBoxes: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseActionStatus = useActionStatus as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUseIncomingBoxes = useIncomingBoxes as jest.Mock;
const mockUseCreatedBoxes = useCreatedBoxes as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

const mockPush = jest.fn();
const mockFetchIncomingBoxes = jest.fn();
const mockFetchCreatedBoxes = jest.fn();

describe('BoxesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({ push: mockPush });

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    mockUseActionStatus.mockReturnValue({
      actionSuccess: null,
      actionError: null,
    });

    mockUseEventPhase.mockReturnValue({
      eventPhase: 1,
      eventPhaseDisplay: 'Fase de Empaquetado',
      isLoadingEventPhase: false,
      errorEventPhase: null,
    });

    mockUseIncomingBoxes.mockReturnValue({
      incomingBoxes: [],
      isLoadingIncoming: false,
      errorIncoming: null,
      selectedLocation: null,
      setSelectedLocation: jest.fn(),
      selectedBoxId: null,
      setSelectedBoxId: jest.fn(),
      fetchIncomingBoxes: mockFetchIncomingBoxes,
      handleToggleItemSelectionInBox: jest.fn(),
      handleDeliverSelectedItemsInBox: jest.fn(),
      handleClearAllSelections: jest.fn(),
    });

    mockUseCreatedBoxes.mockReturnValue({
      createdBoxes: [],
      isLoadingCreated: false,
      errorCreated: null,
      fetchCreatedBoxes: mockFetchCreatedBoxes,
    });

    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn().mockReturnValue('review');
  });

  it('should render loading spinner while checking authentication', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: null, isLoading: true });
    render(<BoxesPage />);
    expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Verificando acceso...');
  });

  it('should redirect to home if user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });
    render(<BoxesPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should render the page content when user is authenticated', () => {
    render(<BoxesPage />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByText('Cajas Entrantes')).toBeInTheDocument();
    expect(screen.getByTestId('incoming-boxes-section')).toBeInTheDocument();
  });

  it('should fetch incoming boxes when review tab is active', async () => {
    render(<BoxesPage />);
    await waitFor(() => {
      expect(mockFetchIncomingBoxes).toHaveBeenCalled();
    });
  });

  it('should switch to assemble tab and save to localStorage', async () => {
    render(<BoxesPage />);
    const assembleTabButton = screen.getByText('Crear Cajas');
    fireEvent.click(assembleTabButton);

    await waitFor(() => {
      expect(screen.getByTestId('assemble-box-section')).toBeInTheDocument();
      expect(localStorage.setItem).toHaveBeenCalledWith('boxesPageActiveTab', 'assemble');
    });
  });

  it('should switch to created tab and fetch created boxes', async () => {
    render(<BoxesPage />);
    const createdTabButton = screen.getByText('Cajas Creadas');
    fireEvent.click(createdTabButton);

    await waitFor(() => {
      expect(screen.getByTestId('created-boxes-section')).toBeInTheDocument();
      expect(mockFetchCreatedBoxes).toHaveBeenCalled();
    });
  });

  it('should load active tab from localStorage on initial render', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('created');
    render(<BoxesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('created-boxes-section')).toBeInTheDocument();
      expect(mockFetchCreatedBoxes).toHaveBeenCalled();
    });
  });

  it('should display action success message', () => {
    mockUseActionStatus.mockReturnValue({ actionSuccess: '¡Caja creada!', actionError: null });
    render(<BoxesPage />);
    expect(screen.getByText('¡Caja creada!')).toBeInTheDocument();
  });

  it('should display action error message', () => {
    mockUseActionStatus.mockReturnValue({ actionSuccess: null, actionError: 'Error al crear.' });
    render(<BoxesPage />);
    expect(screen.getByText('Error al crear.')).toBeInTheDocument();
  });

  describe('with different event phases', () => {
    it('should disable tabs and show message when event phase is 0', () => {
      mockUseEventPhase.mockReturnValue({
        eventPhase: 0,
        eventPhaseDisplay: 'Evento no iniciado',
        isLoadingEventPhase: false,
        errorEventPhase: null,
      });
      render(<BoxesPage />);

      const reviewTabButton = screen.getByText('Cajas Entrantes');
      expect(reviewTabButton).toBeDisabled();

      expect(screen.getByText(/La sección de Cajas Entrantes está deshabilitada/)).toBeInTheDocument();
    });

    it('should not fetch data if event phase is not 1 or 2', async () => {
      mockUseEventPhase.mockReturnValue({
        eventPhase: 0,
        eventPhaseDisplay: 'Evento no iniciado',
        isLoadingEventPhase: false,
        errorEventPhase: null,
      });
      render(<BoxesPage />);

      await waitFor(() => {
        expect(mockFetchIncomingBoxes).not.toHaveBeenCalled();
      });

      const createdTabButton = screen.getByText('Cajas Creadas');
      fireEvent.click(createdTabButton);

      await waitFor(() => {
        expect(mockFetchCreatedBoxes).not.toHaveBeenCalled();
      });
    });

    it('should show loading message for event phase', () => {
      mockUseEventPhase.mockReturnValue({
        eventPhase: null,
        eventPhaseDisplay: 'Cargando...',
        isLoadingEventPhase: true,
        errorEventPhase: null,
      });
      render(<BoxesPage />);
      expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Cargando fase del evento...');
    });

    it('should show fallback message if event phase is null and not loading', () => {
      mockUseEventPhase.mockReturnValue({
        eventPhase: null,
        eventPhaseDisplay: 'Cargando...',
        isLoadingEventPhase: false,
        errorEventPhase: null,
      });
      render(<BoxesPage />);
      expect(screen.getByText(/Cargando la fase del evento.../)).toBeInTheDocument();
    });
  });
});
