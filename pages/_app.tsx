import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import '../styles/globals.css';
import '../styles/contexto.css';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Aplicar tema salvo imediatamente para evitar flash
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Inicializar servidor Socket.io fazendo uma requisição
    fetch('/api/socket', { method: 'GET' })
      .then(() => {
        console.log('✅ Servidor Socket.io inicializado');
      })
      .catch((error) => {
        console.warn('Aviso ao inicializar Socket.io:', error);
      });
  }, []);

  return <Component {...pageProps} />;
}

