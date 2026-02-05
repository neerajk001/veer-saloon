'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Booking {
    id: string; // timestamp or random id
    serviceName: string;
    date: string; // "Mon Jan 15"
    fullDate: string; // "2024-01-15"
    time: string; // ISO string
    customerName: string;
    createdAt: number;
}

export default function MyBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('veer_my_bookings');
        if (stored) {
            try {
                const parsed: Booking[] = JSON.parse(stored);

                // Filter out bookings older than yesterday
                const now = new Date();
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);

                const validBookings = parsed.filter(b => {
                    const bookingDate = new Date(b.fullDate);
                    return bookingDate >= yesterday;
                });

                // Update local storage if we filtered anything
                if (validBookings.length !== parsed.length) {
                    localStorage.setItem('veer_my_bookings', JSON.stringify(validBookings));
                }

                setBookings(validBookings);
            } catch (e) {
                console.error("Failed to parse bookings", e);
            }
        }
    }, []);

    const formatTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch (e) {
            return isoString;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white/80 backdrop-blur-md px-6 py-4 flex items-center border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                <Link
                    href="/"
                    className="p-2 mr-4 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
            </header>

            <main className="flex-1 p-6 max-w-md mx-auto w-full">
                {bookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No Active Bookings</h3>
                        <p className="text-sm text-gray-400 mb-6">Your upcoming appointments will appear here.</p>
                        <Link href="/book" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all active:scale-95">
                            Book Now
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => (
                            <div key={booking.id} className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300">
                                {/* Ticket "Cutout" Effect (Visual only) */}
                                <div className="absolute top-1/2 left-0 w-4 h-4 bg-gray-50 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-r border-gray-200"></div>
                                <div className="absolute top-1/2 right-0 w-4 h-4 bg-gray-50 rounded-full transform translate-x-1/2 -translate-y-1/2 border-l border-gray-200"></div>

                                <div className="p-5 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wide mb-2">
                                                Confirmed
                                            </span>
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{booking.serviceName}</h3>
                                            <p className="text-sm text-gray-500 mt-1">Status: Active</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-gray-900">{formatTime(booking.time)}</div>
                                            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Start Time</div>
                                        </div>
                                    </div>

                                    <div className="border-t border-dashed border-gray-200 pt-4 flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                            {booking.date}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                            {booking.customerName}
                                        </div>
                                    </div>
                                </div>
                                {/* Decorative Bottom stripe */}
                                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
