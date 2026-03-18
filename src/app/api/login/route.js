import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { usuario, password } = await req.json();

    const inputUser = usuario.trim();
    const inputPass = password.trim();

    const FINAL_USER = '$S3rv!c3-D3sk';
    const FINAL_HASH = '$2b$10$S6WO2tiTY1F3WAGFNqjsMuTD4kLprtfzsDYr8wnbppGZ6M01jr0W6';

    const esUsuarioIgual = inputUser === FINAL_USER;
    const esPasswordIgual = bcrypt.compareSync(inputPass, FINAL_HASH);

    if (!esUsuarioIgual || !esPasswordIgual) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('auth', 'true', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}