import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';



export const dynamic = 'force-dynamic';

function parsePriceInput(priceInput: unknown): { price: number; priceMin?: number; priceMax?: number } {
    if (typeof priceInput === 'number') {
        if (!Number.isFinite(priceInput)) throw new Error('Invalid price');
        return { price: priceInput };
    }

    if (typeof priceInput === 'string') {
        const raw = priceInput.trim();
        const single = raw.match(/^\d+(?:\.\d+)?$/);
        if (single) {
            const p = Number(raw);
            if (!Number.isFinite(p)) throw new Error('Invalid price');
            return { price: p };
        }

        const range = raw.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
        if (range) {
            const min = Number(range[1]);
            const max = Number(range[2]);
            if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0 || min > max) {
                throw new Error('Invalid price range');
            }
            return { price: min, priceMin: min, priceMax: max };
        }

        throw new Error('Invalid price format');
    }

    throw new Error('Invalid price');
}


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
        // Require admin auth
        const adminSession = await requireAdmin();
        if (!adminSession) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!id) return NextResponse.json({ message: "Service id is required" }, { status: 400 });

        await dbConnect();
        const service = await Service.findByIdAndDelete(id);
        if (!service) return NextResponse.json({ message: "Service not found" }, { status: 404 });

        return NextResponse.json({ message: "Service deleted successfully" });
    } catch (error) {
        console.error("Error deleting service:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Require admin auth
        const adminSession = await requireAdmin();
        if (!adminSession) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { name, duration, price, isActive } = body;

        if (!id) return NextResponse.json({ message: "Service id is required" }, { status: 400 });

        await dbConnect();
        const service = await Service.findById(id);
        if (!service) return NextResponse.json({ message: "Service not found" }, { status: 404 });

        service.name = name || service.name;
        service.duration = duration !== undefined ? duration : service.duration;
        if (price !== undefined) {
            const parsedPrice = parsePriceInput(price);
            service.price = parsedPrice.price;
            service.priceMin = parsedPrice.priceMin;
            service.priceMax = parsedPrice.priceMax;
        }
        service.isActive = isActive !== undefined ? Boolean(isActive) : service.isActive;
        await service.save();

        return NextResponse.json({ message: "Service updated successfully", service });

    } catch (error) {
        console.error("Error updating service:", error);
        if (error instanceof Error && /price/i.test(error.message)) {
            return NextResponse.json({ message: error.message }, { status: 400 });
        }
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
