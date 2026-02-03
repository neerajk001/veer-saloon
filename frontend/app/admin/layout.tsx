'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    const isLoginPage = pathname === '/admin/login';

    useEffect(() => {
        if (!isLoginPage && status === 'unauthenticated') {
            router.push('/admin/login');
        }
    }, [status, router, isLoginPage]);

    // Allow login page to render without auth check
    if (isLoginPage) {
        return <>{children}</>;
    }

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Verifying authentication...</p>
                </div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return null; // Will redirect in useEffect
    }

    return <>{children}</>;
}
