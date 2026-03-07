import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Closure from '@/models/Closure';

/**
 * POST /api/admin/block-slot
 * Instantly block a specific time range on a single day.
 * Body: { date: "YYYY-MM-DD", startTime: "HH:mm", endTime: "HH:mm", reason?: string }
 * Times must be in 5-minute intervals. Blocked slots become unavailable on the booking page immediately.
 */
const FIVE_MIN_REGEX = /^([01]?\d|2[0-3]):(00|05|10|15|20|25|30|35|40|45|50|55)$/;

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { date, startTime, endTime, reason } = body;

        if (!date) {
            return NextResponse.json({ message: 'Date is required' }, { status: 400 });
        }
        if (!startTime || !endTime) {
            return NextResponse.json({ message: 'Start time and end time are required' }, { status: 400 });
        }

        if (!FIVE_MIN_REGEX.test(startTime) || !FIVE_MIN_REGEX.test(endTime)) {
            return NextResponse.json(
                { message: 'Start and end time must be in 5-minute intervals (e.g. 09:00, 12:30)' },
                { status: 400 }
            );
        }
        if (startTime >= endTime) {
            return NextResponse.json({ message: 'End time must be after start time' }, { status: 400 });
        }

        // Use UTC midnight for the calendar day so closure is found consistently in slots API
        const dayStart = new Date(date + 'T00:00:00.000Z');
        if (isNaN(dayStart.getTime())) {
            return NextResponse.json({ message: 'Invalid date' }, { status: 400 });
        }

        const closure = await Closure.create({
            startDate: dayStart,
            endDate: new Date(dayStart),
            isFullDay: false,
            startTime,
            endTime,
            reason: reason || 'Blocked by admin',
        });

        return NextResponse.json({
            message: 'Time slot blocked. It is now unavailable for booking.',
            closure,
        }, { status: 201 });
    } catch (error) {
        console.error('Block slot error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
