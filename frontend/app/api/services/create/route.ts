import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, duration, price } = body;

        if (!name || duration === undefined || price === undefined) {
            return NextResponse.json({ message: "All fields are required" }, { status: 400 });
        }

        await dbConnect();
        const newService = new Service({
            name,
            duration,
            price
        });
        await newService.save();

        return NextResponse.json({ message: "Service created successfully", service: newService }, { status: 201 });

    } catch (error) {
        console.error("Error creating service:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
