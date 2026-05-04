import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';

/**
 * GET /api/appointments/daily-count?date=YYYY-MM-DD
 * Returns total number of appointments (customers) for the given day.
 * Excludes canceled; counts scheduled, completed, and blocked for that date.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get('date');

        const dateStr = dateParam || new Date().toISOString().split('T')[0];
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return NextResponse.json({ message: 'Invalid date' }, { status: 400 });
        }

        // Match calendar day (same as GET /api/appointments)
        const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

        await dbConnect();

        // Single aggregation instead of 3 separate countDocuments calls
        const [result] = await Appointment.aggregate([
            {
                $match: {
                    date: { $gte: dayStart, $lt: dayEnd },
                    status: { $ne: 'canceled' },
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    scheduled: {
                        $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
                    },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                }
            }
        ]);

        return NextResponse.json({
            date: dateStr,
            total: result?.total ?? 0,
            scheduled: result?.scheduled ?? 0,
            completed: result?.completed ?? 0,
        });
    } catch (error) {
        console.error('Error fetching daily count:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
