"use client";

import { useRouter } from 'next/navigation';
import { FormEvent, useRef, useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth'; 
import ReCAPTCHA from "react-google-recaptcha";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { login: contextLogin } = useAuth(); 

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;

  useEffect(() => {
    if (isMounted && !RECAPTCHA_SITE_KEY) {
      console.error("Error: La variable de entorno NEXT_PUBLIC_RECAPTCHA_SITE_KEY no está configurada o no es accesible.");
    }
  }, [isMounted, RECAPTCHA_SITE_KEY]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    if (!RECAPTCHA_SITE_KEY) {
      setError('Falta reCAPTCHA. Avisá al admin.');
      setIsLoading(false);
      return;
    }

    let recaptchaToken = recaptchaRef.current?.getValue();

    try {
      if (!recaptchaToken) {
        try {
          await recaptchaRef.current?.executeAsync();
          recaptchaToken = recaptchaRef.current?.getValue();
        } catch (e) {
          console.error("Error durante la ejecución de reCAPTCHA:", e);
          setError('Falló reCAPTCHA. Probá otra vez.');
          setIsLoading(false);
          recaptchaRef.current?.reset();
          return;
        }
      }

      if (!recaptchaToken) {
        setError('Completá el reCAPTCHA.');
        setIsLoading(false);
        recaptchaRef.current?.reset(); 
        return;
      }

      const body = JSON.stringify({ email, password, recaptcha: recaptchaToken })
      const response = await fetch(MT_API_HOST + 'auth-token/volunteer/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });

      setIsLoading(false);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error del server.' }));
        throw new Error(errorData.message || `Error  al entrar.`);
      }

      const data = await response.json();
      if (data.token && data.user && data.user.first_name) {
        localStorage.setItem('authToken', data.token);

        const userName = `${data.user.first_name} ${data.user.last_name || ''}`.trim();
        localStorage.setItem('userName', userName);
        if (data.user.isAdmin) localStorage.setItem('isAdmin', data.user.math_admin); 
        if (data.user.id) localStorage.setItem('userId', data.user.id.toString());
        
        contextLogin(data.token, data.user);
        router.push('/');
      } else {
        throw new Error('Sin token del server.');
      }

    } catch (err) {
      setIsLoading(false);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error inesperado al entrar.');
      }
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