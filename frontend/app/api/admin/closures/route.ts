import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Closure from '@/models/Closure';

export async function GET(req: Request) {
    try {
        await dbConnect();

        // Return all current and future closures
        // or just all closures for admin management
        const closures = await Closure.find({}).sort({ startDate: 1 });
        return NextResponse.json(closures);
    } catch (error) {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { startDate, endDate, startTime, endTime, isFullDay, reason } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ message: "Start and End dates are required" }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Reset times to midnight for date comparison consistency
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (end < start) {
            return NextResponse.json({ message: "End date cannot be before start date" }, { status: 400 });
        }

        let finalIsFullDay = isFullDay;
        if (start.getTime() !== end.getTime()) {
            finalIsFullDay = true; // Force full day for multi-day ranges
        }

        // Validate 5-minute interval for partial closures (HH:mm, minutes in 0,5,10,...,55)
        const fiveMinRegex = /^([01]?\d|2[0-3]):(00|05|10|15|20|25|30|35|40|45|50|55)$/;
        if (!finalIsFullDay) {
            if (!startTime || !endTime) {
                return NextResponse.json({ message: "Start time and end time are required for partial day closure" }, { status: 400 });
            }
            if (!fiveMinRegex.test(startTime) || !fiveMinRegex.test(endTime)) {
                return NextResponse.json({ message: "Start and end time must be in 5-minute intervals (e.g. 09:00, 09:05)" }, { status: 400 });
            }
            if (startTime >= endTime) {
                return NextResponse.json({ message: "End time must be after start time" }, { status: 400 });
            }
        }

        const closure = await Closure.create({
            startDate: start,
            endDate: end,
            isFullDay: finalIsFullDay,
            startTime: finalIsFullDay ? null : startTime,
            endTime: finalIsFullDay ? null : endTime,
            reason: reason || 'Shop Closed'
        });

        return NextResponse.json(closure, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ message: "Closure ID required" }, { status: 400 });
        }

        await Closure.findByIdAndDelete(id);
        return NextResponse.json({ message: "Closure removed" });
    } catch (error) {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
