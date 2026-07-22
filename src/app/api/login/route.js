import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// ─── Rate Limiter en memoria ───────────────────────────────────────────────
// Estructura: { ip → { count, firstAttempt } }
const intentos = new Map();

const LIMITE        = 5;              // máximo de intentos
const VENTANA_MS    = 15 * 60 * 1000; // ventana de 15 minutos
const BLOQUEO_MS    = 15 * 60 * 1000; // tiempo de bloqueo tras superar el límite

function obtenerIP(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function verificarRateLimit(ip) {
  const ahora = Date.now();
  const registro = intentos.get(ip);

  // Sin registro previo → primer intento
  if (!registro) {
    intentos.set(ip, { count: 1, firstAttempt: ahora });
    return { bloqueado: false };
  }

  const tiempoTranscurrido = ahora - registro.firstAttempt;

  // Ventana expirada → resetear
  if (tiempoTranscurrido > VENTANA_MS) {
    intentos.set(ip, { count: 1, firstAttempt: ahora });
    return { bloqueado: false };
  }

  // Dentro de ventana y ya superó el límite
  if (registro.count >= LIMITE) {
    const segundosRestantes = Math.ceil((BLOQUEO_MS - tiempoTranscurrido) / 1000);
    return { bloqueado: true, segundosRestantes };
  }

  // Dentro de ventana, incrementar contador
  registro.count++;
  return { bloqueado: false, intentosRestantes: LIMITE - registro.count };
}

function limpiarRegistro(ip) {
  intentos.delete(ip);
}

// Limpieza periódica para no acumular IPs viejas en memoria
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, registro] of intentos.entries()) {
    if (ahora - registro.firstAttempt > VENTANA_MS) {
      intentos.delete(ip);
    }
  }
}, 5 * 60 * 1000); // cada 5 minutos

// ─── Handler ───────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const ip = obtenerIP(req);
    const { bloqueado, segundosRestantes, intentosRestantes } = verificarRateLimit(ip);

    if (bloqueado) {
      const minutos = Math.ceil(segundosRestantes / 60);
      return NextResponse.json(
        { error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} minuto${minutos !== 1 ? 's' : ''}.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(segundosRestantes),
            'X-RateLimit-Limit': String(LIMITE),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const { usuario, password } = await req.json();

    const inputUser = usuario.trim();
    const inputPass = password.trim();

    const FINAL_USER = process.env.AUTH_USER || '$S3rv!c3-D3sk';
    const FINAL_HASH = process.env.AUTH_HASH || '$2b$10$S6WO2tiTY1F3WAGFNqjsMuTD4kLprtfzsDYr8wnbppGZ6M01jr0W6';

    const esUsuarioIgual  = inputUser === FINAL_USER;
    const esPasswordIgual = bcrypt.compareSync(inputPass, FINAL_HASH);

    if (!esUsuarioIgual || !esPasswordIgual) {
      const aviso = intentosRestantes === 1
        ? ' (último intento antes del bloqueo)'
        : intentosRestantes !== undefined ? ` (${intentosRestantes} intentos restantes)` : '';

      return NextResponse.json(
        { error: `Acceso denegado${aviso}` },
        { status: 401 }
      );
    }

    // ✅ Login exitoso → limpiar registro de intentos
    limpiarRegistro(ip);

    const response = NextResponse.json({ ok: true });

    const cookieOptions = {
      httpOnly: false, // necesita leerse desde el cliente (SessionGuard)
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 horas
    };

    response.cookies.set('auth', 'true', { ...cookieOptions, httpOnly: true });
    response.cookies.set('last_activity', Date.now().toString(), cookieOptions);

    return response;

  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
