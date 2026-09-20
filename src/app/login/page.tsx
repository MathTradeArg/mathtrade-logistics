"use client";

import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { triggerHaptic } from '@/utils/haptics';

interface LoginResponse {
  token: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    math_admin: boolean;
  };
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { login: contextLogin } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const NEXT_PUBLIC_ENV = process.env.NEXT_PUBLIC_ENV;
  const { execute: executeLogin, isLoading, error, clearError } = useApi<LoginResponse>('auth-token/volunteer/', {
    method: 'POST',
    isPublic: true,
  });

  useEffect(() => {
    setIsMounted(true);
    if (isMounted && !RECAPTCHA_SITE_KEY) {
      console.error("Error: La variable de entorno NEXT_PUBLIC_RECAPTCHA_SITE_KEY no está configurada o no es accesible.");
    }
  }, [isMounted, RECAPTCHA_SITE_KEY]);

  if (!isMounted) {
    return null;
  }
  return (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY || ''} language="es">
      <LoginForm
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        isMounted={isMounted}
        isLoading={isLoading}
        error={error}
        handleLoginApi={async (email: string, password: string, recaptcha: string) => {
          return executeLogin({ email, password, recaptcha });
        }}
        RECAPTCHA_SITE_KEY={RECAPTCHA_SITE_KEY}
        NEXT_PUBLIC_ENV={NEXT_PUBLIC_ENV}
        contextLogin={contextLogin}
        router={router}
        clearError={clearError}
      />
    </GoogleReCaptchaProvider>
  );

}

function LoginForm({ email, setEmail, password, setPassword, isMounted, isLoading, error, handleLoginApi, RECAPTCHA_SITE_KEY, NEXT_PUBLIC_ENV, contextLogin, router, clearError }: any) {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [loginError, setLoginError] = useState<string>("");

  const getFriendlyError = (err: any): string => {
    if (err?.body?.detail) {
      if (err.body.detail.toLowerCase().includes('bad request')) {
        return 'Revisa tus credenciales y vuelve a intentar.';
      }
      return err.body.detail;
    }
    if (err?.detail) {
      if (typeof err.detail === 'string' && err.detail.toLowerCase().includes('bad request')) {
        return 'Revisa tus credenciales y vuelve a intentar.';
      }
      return err.detail;
    }
    if (err?.message) {
      if (err.message === 'Load failed') return 'No se pudo cargar la información. Verifica tu conexión o intenta más tarde.';
      if (err.message.toLowerCase().includes('bad request')) return 'Revisa tus credenciales y vuelve a intentar.';
      return err.message;
    }
    return "Ocurrió un error inesperado. Por favor, intenta de nuevo.";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    triggerHaptic(20);
    clearError();
    setLoginError("");

    if (NEXT_PUBLIC_ENV === 'prod') {
      if (!RECAPTCHA_SITE_KEY) {
        setLoginError('Falta la configuración de reCAPTCHA. Por favor, avise al administrador.');
        return;
      }
      if (!executeRecaptcha) {
        setLoginError('No se pudo inicializar reCAPTCHA.');
        return;
      }
      try {
        const recaptchaToken = await executeRecaptcha('sign_in');
        if (!recaptchaToken) {
          setLoginError('No se pudo obtener el token de reCAPTCHA. Por favor, intente de nuevo.');
          return;
        }
        const data = await handleLoginApi(email, password, recaptchaToken);
        if (data && data.token && data.user) {
          localStorage.setItem('authToken', data.token);
          const userName = `${data.user.first_name} ${data.user.last_name || ''}`.trim();
          localStorage.setItem('userName', userName);
          if (data.user.math_admin) localStorage.setItem('isAdmin', 'true');
          if (data.user.id) localStorage.setItem('userId', data.user.id.toString());
          contextLogin(data.token, data.user);
          router.push('/');
        } else if (data && data.detail) {
          setLoginError(data.detail);
        } else {
          setLoginError("Credenciales incorrectas o usuario no encontrado.");
        }
      } catch (err: any) {
        console.error("Falló el intento de login:", err);
        setLoginError(getFriendlyError(err));
      }
    } else {
      try {
        const data = await handleLoginApi(email, password, 'mock-recaptcha-token');
        if (data && data.token && data.user) {
          localStorage.setItem('authToken', data.token);
          const userName = `${data.user.first_name} ${data.user.last_name || ''}`.trim();
          localStorage.setItem('userName', userName);
          if (data.user.math_admin) localStorage.setItem('isAdmin', 'true');
          if (data.user.id) localStorage.setItem('userId', data.user.id.toString());
          contextLogin(data.token, data.user);
          router.push('/');
        } else if (data && data.detail) {
          setLoginError(data.detail);
        } else {
          setLoginError("Credenciales incorrectas o usuario no encontrado.");
        }
      } catch (err: any) {
        console.error("Falló el intento de login:", err);
        setLoginError(getFriendlyError(err));
      }
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-page p-4 text-gray-900">
      <div className="staff-panel w-full max-w-sm space-y-8 p-8">
        <h1 className="text-center text-3xl font-bold">Bienvenido</h1>
        <form
          onSubmit={handleSubmit} className="space-y-7"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email" name="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block min-h-14 w-full rounded-md border border-stroke bg-white px-4 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:shadow-[0_0_6px_theme(colors.primary)]"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password" name="password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block min-h-14 w-full rounded-md border border-stroke bg-white px-4 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:shadow-[0_0_6px_theme(colors.primary)]"
              placeholder="••••••••"
            />
          </div>

          {(error || loginError) && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-center text-sm text-danger">
              {loginError || error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || (isMounted && !RECAPTCHA_SITE_KEY)}
              className="staff-btn staff-btn-primary"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}