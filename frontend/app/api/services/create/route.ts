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
        const { name, duration, price, serviceType, packageServiceIds } = body;
        if (!name) {
            return NextResponse.json({ message: "Service name is required" }, { status: 400 });
        }
        const normalizedType = serviceType === 'package' ? 'package' : 'single';

        await dbConnect();
        let normalizedPackageIds: string[] = [];
        let finalDuration: number;
        let finalPrice: number;
        let finalPriceMin: number | undefined;
        let finalPriceMax: number | undefined;

        if (normalizedType === 'package') {
            const selectedIds = Array.isArray(packageServiceIds) ? packageServiceIds.map(String) : [];
            normalizedPackageIds = [...new Set(selectedIds.map((id) => id.trim()).filter(Boolean))];
            if (normalizedPackageIds.length < 2) {
                return NextResponse.json({ message: "Package must include at least 2 services" }, { status: 400 });
            }

            const includedServices = await Service.find({
                _id: { $in: normalizedPackageIds },
                serviceType: { $ne: 'package' }
            });
            if (includedServices.length !== normalizedPackageIds.length) {
                return NextResponse.json({ message: "Package can include only valid single services" }, { status: 400 });
            }

            finalDuration = includedServices.reduce((sum, s: any) => sum + (Number(s.duration) || 0), 0);
            if (!Number.isFinite(finalDuration) || finalDuration <= 0) {
                return NextResponse.json({ message: "Invalid package duration" }, { status: 400 });
            }

            const minTotal = includedServices.reduce((sum, s: any) => sum + (Number(s.priceMin ?? s.price) || 0), 0);
            const maxTotal = includedServices.reduce((sum, s: any) => sum + (Number(s.priceMax ?? s.price) || 0), 0);
            if (!Number.isFinite(minTotal) || !Number.isFinite(maxTotal) || minTotal < 0 || maxTotal < 0 || minTotal > maxTotal) {
                return NextResponse.json({ message: "Invalid package pricing" }, { status: 400 });
            }
            finalPrice = minTotal;
            finalPriceMin = minTotal;
            finalPriceMax = minTotal === maxTotal ? undefined : maxTotal;
        } else {
            if (duration === undefined || price === undefined) {
                return NextResponse.json({ message: "Price and duration are required for single service" }, { status: 400 });
            }
            const parsedPrice = parsePriceInput(price);
            finalDuration = Number(duration);
            if (!Number.isFinite(finalDuration) || finalDuration <= 0) {
                return NextResponse.json({ message: "Invalid duration" }, { status: 400 });
            }
            finalPrice = parsedPrice.price;
            finalPriceMin = parsedPrice.priceMin;
            finalPriceMax = parsedPrice.priceMax;
        }

        const newService = new Service({
            name: String(name).trim(),
            duration: finalDuration,
            price: finalPrice,
            priceMin: finalPriceMin,
            priceMax: finalPriceMax,
            serviceType: normalizedType,
            packageServiceIds: normalizedType === 'package' ? normalizedPackageIds : [],
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
