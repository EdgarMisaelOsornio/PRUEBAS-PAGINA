import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

const TIMEOUT_MS = 10 * 60 * 1000;

export default async function Home() {
  const cookieStore = await cookies();
  const auth = cookieStore.get('auth');
  const lastActivity = cookieStore.get('last_activity');

  if (auth && lastActivity) {
    const elapsed = Date.now() - parseInt(lastActivity.value, 10);
    if (elapsed < TIMEOUT_MS) {
      redirect('/dashboard');
    }
  }

  redirect('/login');
}
