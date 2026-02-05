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

        // If range > 1 day, it MUST be full day closure for simplicity in this logic
        // Or we can allow partial functionality, but the user requirement "weeks" usually implies full closure.
        // Let's enforce full day if days differ, OR allow partial but it implies "Every day from X to Y hours"?
        // User said: "if the admin wants like they are close... he is able to set... which date they are close and it can be multiple date".
        // "This timing will be optional like if he only select the date and apply it that whole day booking will close".

        // Interpretation: 
        // 1. Single Date + Time Range -> Partial Closure on that day.
        // 2. Single Date + Full Day -> Closed that day.
        // 3. Multiple Date Range -> "Closed from X to Y". Usually implies Full Day for that period.
        // Let's assume multi-day range = Full Day Closure.

        let finalIsFullDay = isFullDay;
        if (start.getTime() !== end.getTime()) {
            finalIsFullDay = true; // Force full day for ranges
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
