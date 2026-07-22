'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../login.module.css';

const TIMEOUT_MS = 10 * 60 * 1000;

function Icon({ name, size = 20 }) {
  const paths = {
    user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    lock: <><rect width="16" height="12" x="4" y="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.1 3.2M6.2 6.2C3.6 8 2 12 2 12s3.5 8 10 8a9.8 9.8 0 0 0 4.1-.9"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 9 9 0 1 0 20.5 14.2Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.title = 'Acceso | Service Desk';
    const savedMode = localStorage.getItem('servicedesk-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(savedMode ? savedMode === 'dark' : prefersDark);

    function getCookie(name) {
      const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : null;
    }
    const auth = getCookie('auth');
    const lastActivity = getCookie('last_activity');
    if (auth && lastActivity && Date.now() - Number.parseInt(lastActivity, 10) < TIMEOUT_MS) {
      router.replace('/dashboard');
    }
  }, [router]);

  function toggleDarkMode() {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem('servicedesk-theme', nextMode ? 'dark' : 'light');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsShaking(false);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: formData.get('usuario'), password: formData.get('password') }),
      });

      if (response.ok) {
        localStorage.setItem('sd_last_activity', Date.now().toString());
        window.location.href = '/dashboard';
        return;
      }

      const data = await response.json().catch(() => ({}));
      setError(data.error || 'No pudimos validar tus credenciales. Revisa los datos e intenta nuevamente.');
      if (response.status !== 429) {
        setIsShaking(true);
        window.setTimeout(() => setIsShaking(false), 500);
      }
    } catch {
      setError('No fue posible conectar con el servicio de acceso. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={`${styles.page} ${darkMode ? styles.dark : ''}`}>
      <header className={styles.topbar}>
        <div className={styles.brand}><span>SD</span><strong>Service<b>Desk</b></strong></div>
        <button className={styles.themeToggle} type="button" onClick={toggleDarkMode} aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
          <Icon name={darkMode ? 'sun' : 'moon'} size={19} />
        </button>
      </header>

      <section className={styles.access} aria-labelledby="login-heading">
        <div className={`${styles.card} ${isShaking ? styles.shake : ''}`}>
          <div className={styles.cardHeader}>
            <span className={styles.overline}>Acceso al sistema</span>
            <h1 id="login-heading">Iniciar sesión</h1>
            <p>Ingresa tus credenciales de Service Desk.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label htmlFor="usuario">Usuario</label>
            <div className={styles.field}>
              <Icon name="user" size={18} />
              <input id="usuario" name="usuario" placeholder="Escribe tu usuario" required autoComplete="username" />
            </div>

            <label htmlFor="password">Contraseña</label>
            <div className={styles.field}>
              <Icon name="lock" size={18} />
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Escribe tu contraseña" required autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>

            {error && <div className={styles.error} role="alert" aria-live="polite">{error}</div>}

            <button className={styles.submit} type="submit" disabled={isLoading}>
              <span>{isLoading ? 'Validando acceso…' : 'Ingresar al sistema'}</span>
              {!isLoading && <Icon name="arrow" size={18} />}
            </button>
          </form>

        </div>
      </section>
      <footer className={styles.footer}>© {new Date().getFullYear()} Service Desk</footer>
    </main>
  );
}
