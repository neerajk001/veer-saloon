import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Service from '@/models/Service';
import SaloonConfig from '@/models/SaloonConfig';
import { addMinutesToDate, isOverlapping } from '@/utils/time.utils';
import mongoose from 'mongoose';

export async function POST(req: Request) {
    const session = await dbConnect(); // In this setup dbConnect returns the mongoose instance
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
        const nextAuthSession = await getServerSession(authOptions);
        if (!nextAuthSession) {
            return NextResponse.json({ message: "Unauthorized. Please sign in to book." }, { status: 401 });
        }

        const body = await req.json();
        const { customername, date, serviceId, phoneNumber, startTime } = body;

        if (!customername || !date || !serviceId || !phoneNumber || !startTime) {
            return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
        }

        const service = await Service.findById(serviceId).session(mongoSession);
        if (!service) {
            await mongoSession.abortTransaction();
            return NextResponse.json({ message: 'Service not found' }, { status: 404 });
        }

        const config = await SaloonConfig.findOne().session(mongoSession);
        if (!config) {
            await mongoSession.abortTransaction();
            return NextResponse.json({ message: 'Saloon configuration not found' }, { status: 404 });
        }

        const appointmentDate = new Date(date);
        appointmentDate.setHours(0, 0, 0, 0);

        // --- NEW: MAX 2 ACTIVE BOOKINGS PER DAY RULE ---
        const userEmail = nextAuthSession.user?.email;
        const activeCount = await Appointment.countDocuments({
            userEmail: { $regex: new RegExp(`^${userEmail}$`, 'i') },
            date: {
                $gte: appointmentDate,
                $lt: new Date(appointmentDate.getTime() + 24 * 60 * 60 * 1000)
            },
            status: 'scheduled'
        }).session(mongoSession);

        if (activeCount >= 2) {
            await mongoSession.abortTransaction();
            return NextResponse.json({ 
                message: 'Limit reached: You can have max 2 active bookings per day.' 
            }, { status: 403 });
        }
        // ----------------------------------------------

        const start = new Date(startTime);
        const end = addMinutesToDate(start, service.duration);

        // Ensure no overlapping active appointments for the slot
        const existingAppointments = await Appointment.find({
            date: new Date(date),
            status: { $in: ['scheduled', 'blocked'] },
        }).session(mongoSession);

        for (const appointment of existingAppointments) {
            if (isOverlapping(appointment.startTime, appointment.endTime, start, end)) {
                const isBlocked = appointment.status === 'blocked';
                await mongoSession.abortTransaction();
                return NextResponse.json({
                    message: isBlocked ? 'This time slot is blocked by admin' : 'This time slot is already booked',
                    conflict: true,
                    isBlocked
                }, { status: 409 });
            }
        }

        const newAppointment = new Appointment({
            customername,
            date: new Date(date),
            serviceId,
            phoneNumber,
            startTime: start,
            endTime: end,
            status: body.status || 'scheduled',
            userEmail: userEmail
        });

        await newAppointment.save({ session: mongoSession });

        await mongoSession.commitTransaction();
        return NextResponse.json({
            message: 'Appointment created successfully',
            appointment: newAppointment
        }, { status: 201 });

    } catch (error) {
        await mongoSession.abortTransaction();
        console.error('Error creating appointment:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    } finally {
        await mongoSession.endSession();
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');
        const userEmail = searchParams.get('userEmail');

        await dbConnect();

        // --- MY BOOKINGS: fetch by logged-in user ---
        if (userEmail) {
            const nextAuthSession = await getServerSession(authOptions);
            if (!nextAuthSession) {
                return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
            }

            // Security: users can only fetch THEIR OWN bookings
            const sessionEmail = nextAuthSession.user?.email || '';
            if (sessionEmail.toLowerCase() !== userEmail.toLowerCase()) {
                return NextResponse.json({ message: "Forbidden" }, { status: 403 });
            }

            const appointments = await Appointment.find({
                userEmail: { $regex: new RegExp(`^${userEmail}$`, 'i') },
                status: { $in: ['scheduled'] } // only active/upcoming
            })
                .sort({ startTime: 1 })
                .populate('serviceId', 'name duration price');

            return NextResponse.json(appointments);
        }

        // --- ADMIN: fetch by date ---
        if (!date) {
            return NextResponse.json({ message: "Date or userEmail is required" }, { status: 400 });
        }

        const appointments = await Appointment.find({
            date: new Date(date)
        })
            .sort({ startTime: 1 })
            .populate("serviceId", "name duration");

        return NextResponse.json(appointments);

    } catch (error) {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
