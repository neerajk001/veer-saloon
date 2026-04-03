'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import axios from 'axios';

interface Booking {
    _id: string;
    customername: string;
    phoneNumber: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    serviceId: {
        _id: string;
        name: string;
        duration: number;
        price: number;
    } | null;
}

export default function MyBookingsPage() {
    const { data: session, status } = useSession();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Cancel modal state
    const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
    const [canceling, setCanceling] = useState(false);
    const [cancelError, setCancelError] = useState('');

    // ── Fetch bookings from DB ──────────────────────────────────────────────
    const fetchBookings = async () => {
        if (!session?.user?.email) return;
        try {
            setLoading(true);
            setError('');
            const res = await axios.get(`/api/appointments?userEmail=${encodeURIComponent(session.user.email)}`);
            // Only show future/today bookings
            const now = new Date();
            const upcoming = (res.data as Booking[]).filter(b => new Date(b.startTime) > now);
            setBookings(upcoming);
        } catch (err: any) {
            setError('Could not load your bookings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'authenticated') {
            fetchBookings();
        } else if (status === 'unauthenticated') {
            setLoading(false);
        }
    }, [status, session]);

    // ── Cancel booking ──────────────────────────────────────────────────────
    const handleCancelConfirm = async () => {
        if (!cancelTarget) return;
        try {
            setCanceling(true);
            setCancelError('');
            await axios.patch(`/api/appointments/${cancelTarget._id}`);
            // Remove from list
            setBookings(prev => prev.filter(b => b._id !== cancelTarget._id));
            setCancelTarget(null);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to cancel. Please try again.';
            setCancelError(msg);
        } finally {
            setCanceling(false);
        }
    };

    // ── Helpers ─────────────────────────────────────────────────────────────
    const formatTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const h = date.getHours();
            const m = date.getMinutes();
            const hour12 = h % 12 || 12;
            const ampm = h < 12 ? 'AM' : 'PM';
            return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
        } catch {
            return isoString;
        }
    };

    const formatDate = (isoString: string) => {
        try {
            const d = new Date(isoString);
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
        } catch {
            return isoString;
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#121212] flex flex-col text-gray-100">

            {/* Header */}
            <header className="bg-[#121212]/80 backdrop-blur-md px-6 py-4 flex items-center border-b border-slate-800 sticky top-0 z-10">
                <Link
                    href="/"
                    className="p-2 mr-4 text-gray-300 hover:bg-slate-800 rounded-full transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 className="text-xl font-bold text-gray-100">My Bookings</h1>
            </header>

            <main className="flex-1 p-6 max-w-md mx-auto w-full">

                {/* ── Not signed in ── */}
                {status === 'unauthenticated' && (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-100 mb-1">Sign in to view bookings</h3>
                        <p className="text-sm text-gray-400 mb-6">Your appointments are tied to your account.</p>
                        <button
                            onClick={() => signIn('google')}
                            className="px-6 py-3 bg-white text-black rounded-xl font-bold flex items-center gap-2 hover:bg-gray-100 transition-all active:scale-95"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.82-.15-1.82Z" />
                            </svg>
                            Continue with Google
                        </button>
                    </div>
                )}

                {/* ── Loading ── */}
                {status === 'loading' || (status === 'authenticated' && loading) && (
                    <div className="flex flex-col items-center justify-center h-[50vh]">
                        <div className="w-8 h-8 border-4 border-slate-600 border-t-white rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400 text-sm">Loading your bookings...</p>
                    </div>
                )}

                {/* ── Error ── */}
                {error && !loading && (
                    <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl p-4 mb-6 text-sm flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                        <button onClick={fetchBookings} className="ml-auto underline font-medium text-red-200">Retry</button>
                    </div>
                )}

                {/* ── Authenticated content ── */}
                {status === 'authenticated' && !loading && !error && (
                    <>
                        {bookings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-100 mb-1">No Upcoming Bookings</h3>
                                <p className="text-sm text-gray-400 mb-6">Your upcoming appointments will appear here.</p>
                                <Link
                                    href="/book"
                                    className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95"
                                >
                                    Book Now
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-2">
                                    {bookings.length} Upcoming {bookings.length === 1 ? 'Appointment' : 'Appointments'}
                                </p>

                                {bookings.map((booking) => (
                                    <div
                                        key={booking._id}
                                        className="relative bg-[#1e1e1e] border border-slate-700 rounded-2xl overflow-hidden"
                                    >
                                        {/* Top accent */}
                                        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

                                        <div className="p-5">
                                            {/* Service name + Status badge */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2 border border-emerald-700">
                                                        Confirmed
                                                    </span>
                                                    <h3 className="text-lg font-bold text-white leading-tight">
                                                        {booking.serviceId?.name ?? 'Service'}
                                                    </h3>
                                                    {booking.serviceId?.duration && (
                                                        <p className="text-xs text-gray-500 mt-0.5">{booking.serviceId.duration} mins</p>
                                                    )}
                                                </div>
                                                {/* Time */}
                                                <div className="text-right">
                                                    <div className="text-2xl font-black text-white">{formatTime(booking.startTime)}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Start Time</div>
                                                </div>
                                            </div>

                                            {/* Date + Name row */}
                                            <div className="flex justify-between items-center border-t border-slate-700 pt-3">
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {formatDate(booking.startTime)}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    {booking.customername}
                                                </div>
                                            </div>

                                            {/* Cancel button */}
                                            <button
                                                onClick={() => { setCancelTarget(booking); setCancelError(''); }}
                                                className="mt-4 w-full py-2.5 rounded-xl border border-slate-600 text-sm font-medium text-gray-300 hover:border-red-600 hover:text-red-400 hover:bg-red-950/20 transition-all duration-200"
                                            >
                                                Cancel Booking
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* ── Cancel Confirmation Modal ───────────────────────────────────── */}
            {cancelTarget && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1e1e1e] border border-slate-700 rounded-2xl w-full max-w-sm p-6 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Icon */}
                        <div className="w-12 h-12 bg-red-950 border border-red-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>

                        <h2 className="text-lg font-bold text-white text-center mb-1">Cancel Booking?</h2>
                        <p className="text-sm text-gray-400 text-center mb-1">
                            <span className="font-medium text-gray-200">{cancelTarget.serviceId?.name ?? 'Appointment'}</span>
                        </p>
                        <p className="text-sm text-gray-500 text-center mb-5">
                            {formatDate(cancelTarget.startTime)} at {formatTime(cancelTarget.startTime)}
                        </p>

                        {cancelError && (
                            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-xl text-sm text-red-300 text-center">
                                {cancelError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setCancelTarget(null); setCancelError(''); }}
                                disabled={canceling}
                                className="flex-1 py-3 rounded-xl border border-slate-600 text-sm font-semibold text-gray-300 hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                                Keep It
                            </button>
                            <button
                                onClick={handleCancelConfirm}
                                disabled={canceling}
                                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {canceling ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Canceling...
                                    </>
                                ) : 'Yes, Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
