import '../src/index.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../src/contexts/AuthContext';
import Head from 'next/head';
import { useEffect } from 'react';
import { getStoredTheme, applyTheme } from '../src/lib/theme';

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const t = getStoredTheme();
    if (t) applyTheme(t);
  }, []);

  return (
    <AuthProvider>
      <Head>
        <link rel="icon" href="/Icono.svg" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}


