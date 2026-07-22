'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

const modules = [
  {
    href: '/CLAVES_ETRANSPORTE/claves_etransporte.html',
    icon: 'building',
    eyebrow: 'Operación',
    title: 'E-Transporte',
    description: 'Consulta, organiza y genera información de oficinas y nomenclaturas.',
  },
  {
    href: '/CLAVES_SEDENA/claves_sedena.html',
    icon: 'shield',
    eyebrow: 'Seguridad',
    title: 'Cuentas SEDENA',
    description: 'Genera credenciales corporativas y administra el catálogo de agencias.',
  },
  {
    href: '/VIDEOWALLS/videowalls.html',
    icon: 'monitor',
    eyebrow: 'Infraestructura',
    title: 'Videowalls',
    description: 'Localiza proveedores, procesa archivos y administra pantallas y contactos.',
  },
  {
    href: '/POLITICAS/politicas.html',
    icon: 'document',
    eyebrow: 'Documentación',
    title: 'Políticas',
    description: 'Captura información y genera documentos de acceso listos para impresión.',
  },
];

function Icon({ name, size = 22 }) {
  const paths = {
    building: <><path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M16 8h3a1 1 0 0 1 1 1v12M8 7h4M8 11h4M8 15h4M3 21h18M9 21v-3h2v3"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    monitor: <><rect width="18" height="12" x="3" y="4" rx="2"/><path d="M8 21h8M12 16v5"/></>,
    document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
    grid: <><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/></>,
    moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 9 9 0 1 0 20.5 14.2Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [now, setNow] = useState(null);
  const router = useRouter();

  useEffect(() => {
    document.title = 'Panel operativo | Service Desk';
    const savedMode = localStorage.getItem('servicedesk-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(savedMode ? savedMode === 'dark' : prefersDark);
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = useMemo(() => now?.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }), [now]);

  const timeLabel = useMemo(() => now?.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  }), [now]);

  async function handleLogout() {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      router.push('/');
    }
  }

  function toggleDarkMode() {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem('servicedesk-theme', nextMode ? 'dark' : 'light');
  }

  return (
    <div className={`${styles.shell} ${darkMode ? styles.dark : ''}`}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/dashboard" aria-label="Service Desk, inicio">
          <span className={styles.brandMark}>SD</span>
          <span><strong>Service</strong><b>Desk</b></span>
        </a>

        <div className={styles.sideSection}>
          <span className={styles.sideLabel}>Espacio de trabajo</span>
          <a className={`${styles.sideLink} ${styles.sideLinkActive}`} href="/dashboard">
            <Icon name="grid" size={19} />
            Panel principal
          </a>
        </div>

        <div className={styles.sideSection}>
          <span className={styles.sideLabel}>Herramientas</span>
          {modules.map((module) => (
            <a className={styles.sideLink} href={module.href} key={module.href}>
              <Icon name={module.icon} size={19} />
              {module.title}
            </a>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <span className={styles.version}>Service Desk · 2026</span>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.mobileBrand}>Service<span>Desk</span></span>
            <p className={styles.date}>{dateLabel || 'Cargando fecha...'}</p>
          </div>
          <div className={styles.topActions}>
            <div className={styles.clock} aria-label={`Hora actual ${timeLabel || ''}`}>{timeLabel || '--:--'}</div>
            <button className={styles.iconButton} type="button" onClick={toggleDarkMode} aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
              <Icon name={darkMode ? 'sun' : 'moon'} size={19} />
            </button>
            <button className={styles.logoutButton} type="button" onClick={handleLogout}>
              <Icon name="logout" size={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.hero}>
            <div>
              <span className={styles.kicker}>Centro de operaciones</span>
              <h1>Panel principal</h1>
              <p>Accede a las herramientas internas de Service Desk desde un solo lugar.</p>
            </div>
          </section>

          <section aria-labelledby="tools-heading">
            <div className={styles.sectionHeader}>
              <div><h2 id="tools-heading">Herramientas disponibles</h2><p>Selecciona un módulo para comenzar.</p></div>
              <span className={styles.toolCount}>{modules.length} módulos</span>
            </div>

            <div className={styles.moduleGrid}>
              {modules.map((module) => (
                <a href={module.href} className={styles.moduleCard} key={module.href}>
                  <div className={styles.cardTop}>
                    <span className={styles.moduleIcon}><Icon name={module.icon} size={24} /></span>
                    <span className={styles.cardArrow}><Icon name="arrow" size={19} /></span>
                  </div>
                  <span className={styles.eyebrow}>{module.eyebrow}</span>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                  <span className={styles.openLabel}>Abrir herramienta <Icon name="arrow" size={16} /></span>
                </a>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
