import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';

// ─── PATCH: User-facing cancellation ───────────────────────────────────────
// Only the owner of the appointment can cancel it.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const nextAuthSession = await getServerSession(authOptions);
        if (!nextAuthSession?.user?.email) {
            return NextResponse.json({ message: "Unauthorized. Please sign in." }, { status: 401 });
        }

        const { id } = await params;
        await dbConnect();

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return NextResponse.json({ message: "Appointment not found" }, { status: 404 });
        }

        // Security: ensure the appointment belongs to the logged-in user
        const sessionEmail = nextAuthSession.user.email.toLowerCase();
        const appointmentEmail = (appointment.userEmail || '').toLowerCase();
        if (sessionEmail !== appointmentEmail) {
            return NextResponse.json({ message: "Forbidden. This is not your booking." }, { status: 403 });
        }

        // Only allow canceling scheduled appointments
        if (appointment.status !== 'scheduled') {
            return NextResponse.json({
                message: `Cannot cancel a booking that is already '${appointment.status}'.`
            }, { status: 422 });
        }

        appointment.status = 'canceled';
        await appointment.save();

        return NextResponse.json({ message: "Booking canceled successfully." });

    } catch (error) {
        console.error('Error canceling appointment:', error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// ─── PUT: Admin status update ───────────────────────────────────────────────
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

// ─── DELETE: Admin hard delete ──────────────────────────────────────────────
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
