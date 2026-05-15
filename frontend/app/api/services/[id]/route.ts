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
        const { name, duration, price, isActive, serviceType, packageServiceIds } = body;

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
        if (serviceType !== undefined) {
            service.serviceType = serviceType === 'package' ? 'package' : 'single';
        }
        if (service.serviceType === 'package') {
            const selectedIds: string[] = packageServiceIds !== undefined
                ? (Array.isArray(packageServiceIds) ? packageServiceIds.map(String) : [])
                : ((Array.isArray(service.packageServiceIds) ? service.packageServiceIds : []).map((sid: any) => String(sid)));
            const normalizedPackageIds = [...new Set(selectedIds.map((sid: string) => sid.trim()).filter(Boolean))];
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
            service.packageServiceIds = normalizedPackageIds;
            const totalDuration = includedServices.reduce((sum, s: any) => sum + (Number(s.duration) || 0), 0);
            const minTotal = includedServices.reduce((sum, s: any) => sum + (Number(s.priceMin ?? s.price) || 0), 0);
            const maxTotal = includedServices.reduce((sum, s: any) => sum + (Number(s.priceMax ?? s.price) || 0), 0);
            service.duration = totalDuration;
            service.price = minTotal;
            service.priceMin = minTotal;
            service.priceMax = minTotal === maxTotal ? undefined : maxTotal;
        } else {
            service.packageServiceIds = [];
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
