import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';

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

export async function POST(req: Request) {
    try {
        // Require admin auth
        const adminSession = await requireAdmin();
        if (!adminSession) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, duration, price } = body;

        if (!name || duration === undefined || price === undefined) {
            return NextResponse.json({ message: "All fields are required" }, { status: 400 });
        }

        await dbConnect();
        const parsedPrice = parsePriceInput(price);
        const newService = new Service({
            name,
            duration,
            price: parsedPrice.price,
            priceMin: parsedPrice.priceMin,
            priceMax: parsedPrice.priceMax,
        });
        await newService.save();

        return NextResponse.json({ message: "Service created successfully", service: newService }, { status: 201 });

    } catch (error) {
        console.error("Error creating service:", error);
        if (error instanceof Error && /price/i.test(error.message)) {
            return NextResponse.json({ message: error.message }, { status: 400 });
        }
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
