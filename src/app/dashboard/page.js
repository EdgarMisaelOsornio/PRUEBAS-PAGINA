'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [time, setTime] = useState('');
  const router = useRouter();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      document.title = "Panel Principal | Service Desk"; 
    }, 100);

    const savedMode = localStorage.getItem('dashboard-theme');
    if (savedMode === 'dark') {
      document.body.classList.add('dark-mode');
      setDarkMode(true);
    }

    const updateClock = () => {
      setTime(new Date().toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => {
      clearInterval(timer);
      clearTimeout(timeoutId);
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      router.push('/');
    }
  }

  function toggleDarkMode() {
    if (darkMode) {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('dashboard-theme', 'light');
    } else {
      document.body.classList.add('dark-mode');
      localStorage.setItem('dashboard-theme', 'dark');
    }
    setDarkMode(!darkMode);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap');

        :root {
          --bg-gradient: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          --glass-bg: rgba(255, 255, 255, 0.7);
          --glass-border: rgba(255, 255, 255, 0.4);
          --primary-text: #2d3436;
          --accent: #6c5ce7;
          --danger: #ff7675; /* Color rojo para el botón salir */
          --shadow: 0 20px 50px rgba(0,0,0,0.05);
        }

        .dark-mode {
          --bg-gradient: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
          --glass-bg: rgba(20, 20, 30, 0.6);
          --glass-border: rgba(255, 255, 255, 0.1);
          --primary-text: #ffffff;
          --accent: #a29bfe;
        }

        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: var(--bg-gradient);
          background-attachment: fixed;
          min-height: 100vh;
          color: var(--primary-text);
          margin: 0;
          transition: all 0.5s ease;
          display: flex;
          flex-direction: column;
        }

        .navbar {
          padding: 2rem 5%;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-weight: 800;
          font-size: 1.5rem;
          letter-spacing: -1px;
          text-transform: uppercase;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .nav-links a {
          text-decoration: none;
          color: var(--primary-text);
          font-weight: 600;
          font-size: 0.9rem;
          opacity: 0.8;
          transition: 0.3s;
        }

        .nav-links a:hover { opacity: 1; color: var(--accent); }

        /* Estilo unificado para botones de la barra */
        .btn-ui {
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--glass-border);
          padding: 8px 16px;
          border-radius: 30px;
          cursor: pointer;
          color: var(--primary-text);
          font-weight: 600;
          transition: 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: inherit;
        }

        .btn-ui:hover {
          transform: translateY(-2px);
          border-color: var(--accent);
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .btn-logout {
          background: rgba(255, 118, 117, 0.1);
          border: 1px solid rgba(255, 118, 117, 0.3);
          color: var(--danger);
        }

        .btn-logout:hover {
          background: var(--danger);
          color: white;
          border-color: var(--danger);
        }

        .container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
        }

        #clock {
          font-size: 5rem;
          font-weight: 200;
          margin-bottom: 0.5rem;
          letter-spacing: -2px;
          opacity: 0.9;
        }

        .hero-text {
          text-align: center;
          margin-bottom: 3rem;
        }

        .hero-text h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 10px;
          background: linear-gradient(to right, var(--primary-text), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 25px;
          width: 100%;
        }

        .card {
          background: var(--glass-bg);
          backdrop-filter: blur(15px);
          border: 1px solid var(--glass-border);
          padding: 35px 20px;
          border-radius: 24px;
          text-decoration: none;
          color: var(--primary-text);
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: var(--shadow);
        }

        .card:hover {
          transform: translateY(-10px);
          /* En lugar de blanco fijo, usamos una transparencia que funcione en ambos modos */
          background: var(--accent); 
          border-color: var(--accent);
          box-shadow: 0 15px 30px rgba(0,0,0,0.2);
        }

        .card:hover .card-title,
        .card:hover .card-icon {
          color: white !important; /* El texto se volverá blanco siempre sobre el color de acento */
          -webkit-text-fill-color: white !important; /* Necesario por el gradiente del h1 si afectara */
        }

        .card-icon { font-size: 2.5rem; margin-bottom: 15px; }
        .card-title { font-weight: 700; font-size: 1rem; text-align: center; text-transform: uppercase; letter-spacing: 1px; }

        footer { padding: 2rem; text-align: center; font-size: 0.85rem; opacity: 0.6; }

        @media (max-width: 768px) {
          #clock { font-size: 3.5rem; }
          .navbar { flex-direction: column; gap: 20px; }
        }
          .text-gradient {
            background: linear-gradient(to right, #ffffff 30%, var(--accent) 60%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: inline-block;
          }
      `}</style>

      <nav className="navbar">
        <div className="logo">
          Servi<span className="text-gradient">ceDesk</span>
        </div>
        <div className="nav-links">
          <a href="#">Inicio</a>
          <a href="#">Ayuda</a>
          <button className="btn-ui" onClick={toggleDarkMode}>
            {darkMode ? '☀️ Modo Claro' : '🌙 Modo Noche'}
          </button>
          <button className="btn-ui btn-logout" onClick={handleLogout}>
            ✕&nbsp;&nbsp;Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="container">
        <div id="clock">{time}</div>
        <div className="hero-text">
          <h1>Panel Operativo</h1>
          <p>Seleccione un módulo para comenzar la gestión técnica.</p>
        </div>
        <div className="grid">
          <a href="/CLAVES_ETRANSPORTE/claves_etransporte.html" className="card">
            <span className="card-icon">📦</span>
            <span className="card-title">E-Transporte</span>
          </a>
          <a href="/CLAVES_SEDENA/claves_sedena.html" className="card">
            <span className="card-icon">🛡️</span>
            <span className="card-title">SEDENA</span>
          </a>
          <a href="/VIDEOWALLS/videowalls.html" className="card">
            <span className="card-icon">🖥️</span>
            <span className="card-title">Video Walls</span>
          </a>
          <a href="/POLITICAS/politicas.html" className="card">
            <span className="card-icon">⚖️</span>
            <span className="card-title">Políticas</span>
          </a>
        </div>
      </div>

      <footer>© 2026 Generador Profesional — Desarrollado por ServiceDesk</footer>
    </>
  );
}