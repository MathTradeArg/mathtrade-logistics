import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '../page';
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/useApi', () => ({
  useApi: jest.fn(),
}));

jest.mock('react-google-recaptcha', () => {
    const ReCAPTCHA = React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        getValue: jest.fn().mockReturnValue('mock-recaptcha-token'),
        executeAsync: jest.fn().mockResolvedValue('mock-recaptcha-token'),
        reset: jest.fn(),
      }));
      return <div data-testid="mock-recaptcha" />;
    });
    ReCAPTCHA.displayName = 'ReCAPTCHA';
    return ReCAPTCHA;
  });

describe('LoginPage', () => {
  const mockContextLogin = jest.fn();
  const mockExecuteLogin = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login: mockContextLogin,
    });
    (useApi as jest.Mock).mockReturnValue({
      execute: mockExecuteLogin,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    });
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-key';
  });

  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('allows user to fill the form', () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'password123' } });
    expect(screen.getByLabelText(/email/i)).toHaveValue('test@test.com');
    expect(screen.getByLabelText(/contraseña/i)).toHaveValue('password123');
  });

  it('calls login API on submit and redirects on success', async () => {
    const mockUser = { id: 1, first_name: 'Test', last_name: 'User', math_admin: false };
    const mockLoginResponse = { token: 'fake-token', user: mockUser };
    mockExecuteLogin.mockResolvedValue(mockLoginResponse);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockExecuteLogin).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
        recaptcha: 'mock-recaptcha-token',
      });
      expect(mockContextLogin).toHaveBeenCalledWith(mockLoginResponse.token, mockLoginResponse.user);
    });
  });
});