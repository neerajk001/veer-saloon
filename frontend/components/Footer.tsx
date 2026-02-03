import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-300 py-6 md:py-8 px-4 md:px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-center md:text-left">
                    {/* Brand Section */}
                    <div>
                        <h3 className="text-white text-lg md:text-xl font-bold mb-2 md:mb-4">GlowSalon</h3>
                        <p className="text-xs md:text-sm text-gray-400 max-w-xs mx-auto md:mx-0">
                            Your trusted salon for premium grooming services. Book instantly.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="flex flex-col items-center md:items-start">
                        <h4 className="text-white text-xs md:text-sm font-semibold mb-2 md:mb-4 uppercase tracking-wider">Quick Links</h4>
                        <ul className="space-y-1.5 md:space-y-2">
                            <li>
                                <Link href="/" className="text-xs md:text-sm hover:text-white transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href="/book" className="text-xs md:text-sm hover:text-white transition-colors">
                                    Book Appointment
                                </Link>
                            </li>
                            <li>
                                <Link href="/admin/login" className="text-xs md:text-sm hover:text-blue-400 transition-colors flex items-center gap-2 justify-center md:justify-start">
                                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Admin Login
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-col items-center md:items-start">
                        <h4 className="text-white text-xs md:text-sm font-semibold mb-2 md:mb-4 uppercase tracking-wider">Contact</h4>
                        <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                            <li className="flex items-center gap-2 justify-center md:justify-start">
                                <svg className="w-3 h-3 md:w-4 md:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>Ganesh404veer@gmail.com</span>
                            </li>
                            <li className="flex items-center gap-2 justify-center md:justify-start">
                                <svg className="w-3 h-3 md:w-4 md:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Your Location</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4 text-center md:text-left">
                    <p className="text-[10px] md:text-sm text-gray-500">
                        © {new Date().getFullYear()} GlowSalon. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/admin/login" className="text-[10px] md:text-xs text-gray-600 hover:text-blue-400 transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            Staff Access
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
