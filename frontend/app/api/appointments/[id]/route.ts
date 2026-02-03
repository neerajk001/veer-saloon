import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json({ message: "Status is required" }, { status: 400 });
        }

        const validStatuses = ['scheduled', 'completed', 'canceled', 'blocked'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ message: "Invalid status" }, { status: 400 });
        }

        await dbConnect();
        const appointment = await Appointment.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).populate("serviceId", "name duration");

        if (!appointment) {
            return NextResponse.json({ message: "Appointment not found" }, { status: 404 });
        }

        return NextResponse.json({
            message: "Appointment updated successfully",
            appointment
        });

    } catch (error) {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        await dbConnect();
        const appointment = await Appointment.findByIdAndDelete(id);

        if (!appointment) {
            return NextResponse.json({ message: "Appointment not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Appointment deleted successfully" });
    } catch (error) {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
