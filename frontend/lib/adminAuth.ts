import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';

/**
 * Server-only admin auth helper.
 * Verify the current request is from an authenticated admin.
 * Returns the session if admin, null otherwise.
 */
export async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    const role = (session.user as any)?.role;
    if (role === 'admin' || isAdminEmail(session.user.email)) {
        return session;
    }
    return null;
}
