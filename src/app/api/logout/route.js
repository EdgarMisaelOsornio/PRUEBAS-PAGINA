import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set('auth', '', { path: '/', maxAge: 0 });
  response.cookies.set('last_activity', '', { path: '/', maxAge: 0 });

  return response;
}
