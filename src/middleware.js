import { NextResponse } from 'next/server';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos

export default function middleware(req) {
  const auth = req.cookies.get('auth');
  const lastActivity = req.cookies.get('last_activity');
  const pathname = req.nextUrl.pathname;

  // Sesión válida = ambas cookies presentes y dentro del timeout de 10 min
  const sessionValid =
    auth &&
    lastActivity &&
    Date.now() - parseInt(lastActivity.value, 10) < TIMEOUT_MS;

  // Si ya tiene sesión activa y va al login o raíz → redirigir al dashboard
  if (sessionValid && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  const protectedRoutes = [
    '/dashboard',
    '/CLAVES_ETRANSPORTE',
    '/CLAVES_SEDENA',
    '/VIDEOWALLS',
    '/POLITICAS'
  ];

  // Si intenta entrar a una ruta protegida sin sesión → redirigir al login
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!sessionValid) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/CLAVES_ETRANSPORTE/:path*',
    '/CLAVES_SEDENA/:path*',
    '/VIDEOWALLS/:path*',
    '/POLITICAS/:path*',
  ],
};
