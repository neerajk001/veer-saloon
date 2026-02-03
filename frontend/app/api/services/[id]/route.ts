import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';



export const revalidate = 2592000; // Cache for 30 days


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ message: "Service id is required" }, { status: 400 });

        await dbConnect();
        const service = await Service.findById(id);
        if (!service) return NextResponse.json({ message: "Service not found" }, { status: 404 });

        return NextResponse.json({ service });
    } catch (error) {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}


export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ message: "Service id is required" }, { status: 400 });

        await dbConnect();
        const service = await Service.findByIdAndDelete(id);
        if (!service) return NextResponse.json({ message: "Service not found" }, { status: 404 });

        return NextResponse.json({ message: "Service deleted successfully" });
    } catch (error) {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, duration, price } = body;

        if (!id) return NextResponse.json({ message: "Service id is required" }, { status: 400 });

        await dbConnect();
        const service = await Service.findById(id);
        if (!service) return NextResponse.json({ message: "Service not found" }, { status: 404 });

        service.name = name || service.name;
        service.duration = duration || service.duration;
        service.price = price || service.price;
        await service.save();

        return NextResponse.json({ message: "Service updated successfully", service });

    } catch (error) {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
