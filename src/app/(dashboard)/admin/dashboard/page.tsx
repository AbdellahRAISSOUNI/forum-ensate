import { cookies } from 'next/headers';
import Link from 'next/link';

const SESSION_COOKIE = 'admin_session';

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  if (!session?.value) {
    return (
      <div className="min-h-screen bg-white text-[#0b2b5c] flex flex-col items-center justify-center gap-4">
        <p>Not authenticated.</p>
        <Link className="underline text-[#0b2b5c]" href="/admin/login">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#0b2b5c] flex items-center justify-center">
      <h1 className="text-3xl font-bold">Hello, Admin</h1>
    </div>
  );
}


