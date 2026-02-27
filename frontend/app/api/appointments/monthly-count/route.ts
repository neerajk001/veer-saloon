import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';

/**
 * GET /api/appointments/monthly-count?year=YYYY&month=M
 * Or: ?date=YYYY-MM
 * Returns total number of appointments (customers) for the given month.
 * Excludes canceled; sums scheduled, completed, blocked for that month.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get('date');
        const yearParam = searchParams.get('year');
        const monthParam = searchParams.get('month');

        let year: number;
        let month: number;

        if (dateParam) {
            const [y, m] = dateParam.split('-').map(Number);
            if (!y || !m || m < 1 || m > 12) {
                return NextResponse.json({ message: 'Invalid date (use YYYY-MM)' }, { status: 400 });
            }
            year = y;
            month = m - 1; // 0-indexed for Date
        } else if (yearParam && monthParam) {
            year = parseInt(yearParam, 10);
            month = parseInt(monthParam, 10) - 1;
            if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
                return NextResponse.json({ message: 'Invalid year or month' }, { status: 400 });
            }
        } else {
            const now = new Date();
            year = now.getUTCFullYear();
            month = now.getUTCMonth();
        }

        const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

        await dbConnect();

        const total = await Appointment.countDocuments({
            date: { $gte: monthStart, $lt: monthEnd },
            status: { $ne: 'canceled' },
        });

        const scheduled = await Appointment.countDocuments({
            date: { $gte: monthStart, $lt: monthEnd },
            status: 'scheduled',
        });

        const completed = await Appointment.countDocuments({
            date: { $gte: monthStart, $lt: monthEnd },
            status: 'completed',
        });

        const monthLabel = `${year}-${String(month + 1).padStart(2, '0')}`;

        return NextResponse.json({
            year,
            month: month + 1,
            date: monthLabel,
            total,
            scheduled,
            completed,
        });
    } catch (error) {
        console.error('Error fetching monthly count:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
