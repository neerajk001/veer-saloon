import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';



export const dynamic = 'force-dynamic';


export async function GET() {
    try {
        await dbConnect();
        // Only return active services to customers
        const services = await Service.find({ isActive: { $ne: false } })
            .sort({ serviceType: 1, name: 1 })
            .populate({ path: 'packageServiceIds', select: 'name', strictPopulate: false });

        // Return 200 with empty array instead of 404 for empty list
        return NextResponse.json({ services });
    } catch (error) {
        console.error('GET /api/services/all failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({
            message: "Internal server error",
            ...(process.env.NODE_ENV !== 'production' ? { error: errorMessage } : {})
        }, { status: 500 });
    }
}
