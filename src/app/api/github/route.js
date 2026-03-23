import { NextResponse } from 'next/server';

// ─── Variables de entorno (definidas en .env.local) ──────────────────────────
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO  = process.env.GITHUB_REPO;

// ─── Validación de configuración ─────────────────────────────────────────────
function validarConfig() {
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error('❌ Faltan variables de entorno: GITHUB_TOKEN, GITHUB_OWNER o GITHUB_REPO');
    return false;
  }
  return true;
}

// ─── Headers comunes para la GitHub API ──────────────────────────────────────
function githubHeaders() {
  return {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept':        'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent':    'ServiceDesk-App',
  };
}

// ─── GET /api/github?file=<ruta> ──────────────────────────────────────────────
// Devuelve: { sha, download_url } del archivo en el repositorio.
// Lo usa el cliente para (a) obtener el SHA necesario para el PUT y
// (b) obtener la URL de descarga del Excel actual.
export async function GET(request) {
  if (!validarConfig()) {
    return NextResponse.json(
      { error: 'Configuración del servidor incompleta. Revisa las variables de entorno.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('file');

  if (!filePath) {
    return NextResponse.json(
      { error: 'El parámetro "file" es requerido.' },
      { status: 400 }
    );
  }

  // Codificamos cada segmento del path para manejar espacios y caracteres especiales
  const encodedPath = filePath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  const apiURL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodedPath}`;

  try {
    const res = await fetch(apiURL, { headers: githubHeaders() });

    if (!res.ok) {
      const body = await res.text();
      console.error(`❌ GitHub API GET error ${res.status}:`, body);

      if (res.status === 404) {
        return NextResponse.json(
          { error: `Archivo no encontrado en el repositorio: ${filePath}` },
          { status: 404 }
        );
      }
      if (res.status === 401) {
        return NextResponse.json(
          { error: 'Token de GitHub inválido o sin permisos.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: `Error de GitHub API: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      sha:          data.sha,
      download_url: data.download_url,
      size:         data.size,
      name:         data.name,
    });

  } catch (error) {
    console.error('❌ Error en GET /api/github:', error);
    return NextResponse.json(
      { error: 'Error interno al contactar GitHub API.' },
      { status: 500 }
    );
  }
}

// ─── PUT /api/github ──────────────────────────────────────────────────────────
// Body JSON: { file: string, sha: string, content: string (base64), message: string }
// Hace el commit del archivo actualizado al repositorio.
export async function PUT(request) {
  if (!validarConfig()) {
    return NextResponse.json(
      { error: 'Configuración del servidor incompleta. Revisa las variables de entorno.' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'El body de la petición no es JSON válido.' },
      { status: 400 }
    );
  }

  const { file, sha, content, message } = body;

  if (!file || !sha || !content || !message) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos: file, sha, content, message.' },
      { status: 400 }
    );
  }

  // Codificamos el path igual que en el GET
  const encodedPath = file
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  const apiURL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodedPath}`;

  try {
    const res = await fetch(apiURL, {
      method: 'PUT',
      headers: {
        ...githubHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content,  // contenido del archivo en base64
        sha,      // SHA del archivo actual (requerido por GitHub para editar)
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`❌ GitHub API PUT error ${res.status}:`, errorBody);

      if (res.status === 409) {
        return NextResponse.json(
          { error: 'Conflicto: el SHA del archivo no coincide. Recarga y vuelve a intentarlo.' },
          { status: 409 }
        );
      }
      if (res.status === 401) {
        return NextResponse.json(
          { error: 'Token de GitHub sin permisos de escritura.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: `Error al hacer commit: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      ok:      true,
      commit:  data.commit?.sha,
      message: data.commit?.message,
    });

  } catch (error) {
    console.error('❌ Error en PUT /api/github:', error);
    return NextResponse.json(
      { error: 'Error interno al hacer commit en GitHub.' },
      { status: 500 }
    );
  }
}
