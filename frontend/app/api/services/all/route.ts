import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';



export const dynamic = 'force-dynamic';


export async function GET() {
    try {
        await dbConnect();
        // Only return active services to customers
        const services = await Service.find({ isActive: { $ne: false } });

        // Return 200 with empty array instead of 404 for empty list
        return NextResponse.json({ services });
    } catch (error) {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
