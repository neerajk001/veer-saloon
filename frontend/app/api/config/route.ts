import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaloonConfig from '@/models/SaloonConfig';


export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
    try {
        await dbConnect();
        const config = await SaloonConfig.findOne();

        if (!config) {
            return NextResponse.json({ message: "Saloon config not set yet" }, { status: 404 });
        }

        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}


export async function POST(req: Request) {
    try {
        await dbConnect();
        const existingConfig = await SaloonConfig.findOne();

        if (existingConfig) {
            return NextResponse.json({ message: "Saloon config already exists" }, { status: 400 });
        }

        const body = await req.json();
        const { morningSlot, eveningSlot, daysOff } = body;

        if (!morningSlot || !eveningSlot) {
            return NextResponse.json({ message: "Morning slot and evening slot are required" }, { status: 400 });
        }

        const config = await SaloonConfig.create({
            morningSlot,
            eveningSlot,
            daysOff: daysOff || []
        });

        return NextResponse.json(config, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { morningSlot, eveningSlot, daysOff } = body;

        const config = await SaloonConfig.findOne();

        if (!config) {
            return NextResponse.json({ message: "Saloon config not found" }, { status: 404 });
        }

        if (morningSlot !== undefined) config.morningSlot = morningSlot;
        if (eveningSlot !== undefined) config.eveningSlot = eveningSlot;
        if (daysOff !== undefined) config.daysOff = daysOff;

        await config.save();

        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
