import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-300 py-3 px-4 border-t border-gray-800 transition-all duration-300">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] md:text-xs">

                {/* Left: Brand & Copyright */}
                <div className="flex items-center gap-3">
                    <h3 className="text-white font-bold tracking-wide">Veer Saloon</h3>
                    <span className="hidden md:block text-gray-600">|</span>
                    <p className="text-gray-500">
                        © {new Date().getFullYear()}
                    </p>
                </div>

                {/* Center: Navigation Links */}
                <nav className="flex items-center gap-4 md:gap-6">
                    <Link href="/" className="hover:text-white transition-colors">
                        Home
                    </Link>
                    <Link href="/book" className="hover:text-white transition-colors">
                        Book
                    </Link>
                    <Link href="/admin/login" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Admin
                    </Link>
                </nav>

                {/* Right: Contact & Info */}
                <div className="flex items-center gap-4 text-gray-500">
                    <div className="flex items-center gap-1.5 hover:text-gray-300 transition-colors cursor-default">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="hidden sm:inline">Ganesh404veer@gmail.com</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
