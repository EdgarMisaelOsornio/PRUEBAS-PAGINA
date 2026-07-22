'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const TIMEOUT_MS  = 10 * 60 * 1000; // 10 minutos
const WARN_BEFORE = 60 * 1000;      // aviso 1 minuto antes
const LS_KEY      = 'sd_last_activity';

// Rutas que NO necesitan el guard (login / raíz)
const PUBLIC_PATHS = ['/login', '/'];

export default function SessionGuard() {
  const router   = useRouter();
  const pathname = usePathname();
  const warnRef  = useRef(null);
  const timersRef = useRef({ warn: null, expire: null, tick: null });

  const isProtected = !PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!isProtected) return;

    /* ── helpers ─────────────────────────────── */
    function clearTimers() {
      clearTimeout(timersRef.current.warn);
      clearTimeout(timersRef.current.expire);
      clearInterval(timersRef.current.tick);
    }

    async function expireSession() {
      clearTimers();
      removeWarning();
      localStorage.removeItem(LS_KEY);
      document.cookie = 'last_activity=; path=/; max-age=0';
      await fetch('/api/logout', { method: 'POST' }).catch(() => {});
      router.push('/login');
    }

    function touch() {
      const now = Date.now().toString();
      localStorage.setItem(LS_KEY, now);
      // Actualizar la cookie para que page.js pueda verificarla al reabrir la pestaña
      document.cookie = `last_activity=${now}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
      resetTimers();
    }

    /* ── al cerrar la pestaña o navegador, actualiza el timestamp ── */
    // Esto evita que al volver a abrir se cuente el tiempo que estuvo cerrado
    function handleBeforeUnload() {
      localStorage.setItem(LS_KEY, Date.now().toString());
    }

    /* ── aviso visual ─────────────────────────── */
    function removeWarning() {
      if (warnRef.current) {
        warnRef.current.remove();
        warnRef.current = null;
      }
    }

    function showWarning(msLeft) {
      if (warnRef.current) return; // ya está visible

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(3,15,20,0.68); z-index:99999;
        display:flex; align-items:center; justify-content:center;
        padding:20px; font-family:inherit; backdrop-filter:blur(6px);
      `;
      overlay.innerHTML = `
        <div style="
          background:#fff; border:1px solid #d9e4e6; border-radius:17px; padding:30px;
          max-width:390px; width:100%; text-align:left;
          box-shadow:0 28px 80px rgba(0,0,0,0.32);
        ">
          <div style="width:40px;height:40px;display:grid;place-items:center;margin-bottom:18px;border-radius:11px;color:#0f766e;background:#e4f4f1;font-size:12px;font-weight:800;">SEC</div>
          <div style="color:#0f766e;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Seguridad de la sesión</div>
          <h3 style="margin:8px 0 8px; font-size:20px;letter-spacing:-.03em; color:#13262c;">Tu sesión está por expirar</h3>
          <p style="margin:0 0 22px; color:#63777d; font-size:12px; line-height:1.6;">
            Cerraremos la sesión en <strong id="sd-countdown" style="color:#13262c;">${Math.ceil(msLeft/1000)}</strong> segundos por inactividad. Confirma si deseas continuar trabajando.
          </p>
          <button id="sd-keep-btn" style="
            min-height:44px;background:#0f766e; color:#fff; border:none; border-radius:10px;
            padding:0 20px; font-size:12px; font-weight:750; cursor:pointer; width:100%;
          ">Mantener sesión activa</button>
        </div>
      `;
      document.body.appendChild(overlay);
      warnRef.current = overlay;

      // Cuenta regresiva
      let secs = Math.ceil(msLeft / 1000);
      const countEl = overlay.querySelector('#sd-countdown');
      timersRef.current.tick = setInterval(() => {
        secs--;
        if (countEl) countEl.textContent = secs;
        if (secs <= 0) clearInterval(timersRef.current.tick);
      }, 1000);

      overlay.querySelector('#sd-keep-btn').addEventListener('click', () => {
        removeWarning();
        touch();
      });
    }

    /* ── timers ───────────────────────────────── */
    function resetTimers() {
      clearTimers();
      timersRef.current.warn   = setTimeout(() => showWarning(WARN_BEFORE), TIMEOUT_MS - WARN_BEFORE);
      timersRef.current.expire = setTimeout(() => expireSession(),           TIMEOUT_MS);
    }

    /* ── al montar / volver a la pestaña ─────── */
    function checkOnLoad() {
      const last = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
      if (last && Date.now() - last >= TIMEOUT_MS) {
        expireSession();
        return;
      }
      touch();
    }

    /* ── eventos de actividad ─────────────────── */
    const EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    EVENTS.forEach(ev => document.addEventListener(ev, touch, { passive: true }));

    /* ── visibilitychange: usuario regresa a la pestaña ── */
    function onVisibility() {
      if (document.visibilityState === 'visible') checkOnLoad();
    }
    document.addEventListener('visibilitychange', onVisibility);

    /* ── beforeunload: actualiza timestamp al cerrar ── */
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Arrancar
    checkOnLoad();

    return () => {
      clearTimers();
      removeWarning();
      EVENTS.forEach(ev => document.removeEventListener(ev, touch));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isProtected, router]);

  return null; // componente invisible
}
