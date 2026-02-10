import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';



export const dynamic = 'force-dynamic';


export async function GET() {
    try {
        await dbConnect();
        const services = await Service.find();

        // Maintain same response structure as backend
        if (services.length === 0) {
            // Backend returned 404 if no services, but usually empty list is 200. sticking to backend logic
            // Actually backend logic: return res.status(404).json({message : "No services found"});
            return NextResponse.json({ message: "No services found" }, { status: 404 });
        }
        return NextResponse.json({ services });
    } catch (error) {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

