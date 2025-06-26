"use client";

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import ReCAPTCHA from "react-google-recaptcha";
import { useApi } from '@/hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
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
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { login: contextLogin } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearError(); 

    if (!RECAPTCHA_SITE_KEY) {
      alert('Falta la configuración de reCAPTCHA. Por favor, avise al administrador.');
      return;
    }

    let recaptchaToken = recaptchaRef.current?.getValue();

    try {
      if (!recaptchaToken) {
        await recaptchaRef.current?.executeAsync();
        recaptchaToken = recaptchaRef.current?.getValue();
      }

      if (!recaptchaToken) {
        alert('No se pudo obtener el token de reCAPTCHA. Por favor, intente de nuevo.');
        recaptchaRef.current?.reset();
        return;
      }

      const data = await executeLogin({ email, password, recaptcha: recaptchaToken });

      if (data && data.token && data.user) {
        localStorage.setItem('authToken', data.token);
        const userName = `${data.user.first_name} ${data.user.last_name || ''}`.trim();
        localStorage.setItem('userName', userName);
        if (data.user.math_admin) localStorage.setItem('isAdmin', 'true');
        if (data.user.id) localStorage.setItem('userId', data.user.id.toString());
        
        contextLogin(data.token, data.user);
        router.push('/');
      }
    } catch (err) {
      console.error("Falló el intento de login:", err);
      recaptchaRef.current?.reset();
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm p-8 space-y-8 bg-white dark:bg-gray-800 shadow-2xl rounded-xl">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">Bienvenido</h1>
        <form onSubmit={handleSubmit} className="space-y-7">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email" name="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary-blue focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Contraseña
            </label>
            <input
              id="password" name="password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary-blue focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          {isMounted && RECAPTCHA_SITE_KEY && (
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                size="invisible" 
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || (isMounted && !RECAPTCHA_SITE_KEY)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-base font-semibold text-white bg-secondary-blue hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-blue focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out active:scale-95 active:opacity-75 disabled:active:scale-100"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}