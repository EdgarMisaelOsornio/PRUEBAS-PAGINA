import { NextResponse } from 'next/server';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO  = process.env.GITHUB_REPO;

function validarConfig() {
  return !!(GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO);
}

function githubHeaders() {
  return {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ServiceDesk-App',
  };
}

export async function GET(request) {
  if (!validarConfig()) return NextResponse.json({ error: 'Faltan variables de entorno.' }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('file');
  if (!filePath) return NextResponse.json({ error: 'Parámetro "file" requerido.' }, { status: 400 });
  const encodedPath = filePath.split('/').map(s => encodeURIComponent(s)).join('/');
  const apiURL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodedPath}`;
  try {
    const res = await fetch(apiURL, { headers: githubHeaders() });
    if (!res.ok) return NextResponse.json({ error: `GitHub API error: ${res.status}` }, { status: res.status });
    const data = await res.json();
    return NextResponse.json({ sha: data.sha, download_url: data.download_url });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!validarConfig()) return NextResponse.json({ error: 'Faltan variables de entorno.' }, { status: 500 });
  const { file, sha, content, message } = await request.json();
  if (!file || !sha || !content || !message) return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 });
  const encodedPath = file.split('/').map(s => encodeURIComponent(s)).join('/');
  const apiURL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodedPath}`;
  try {
    const res = await fetch(apiURL, {
      method: 'PUT',
      headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content, sha }),
    });
    if (!res.ok) return NextResponse.json({ error: `Error al hacer commit: ${res.status}` }, { status: res.status });
    const data = await res.json();
    return NextResponse.json({ ok: true, commit: data.commit?.sha });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}