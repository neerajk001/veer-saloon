import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Service from '@/models/Service';
import SaloonConfig from '@/models/SaloonConfig';
import { addMinutesToDate, isOverlapping } from '@/utils/time.utils';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { customername, date, serviceId, phoneNumber, startTime } = body;

        if (!customername || !date || !serviceId || !phoneNumber || !startTime) {
            return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
        }

        await dbConnect();
        const service = await Service.findById(serviceId);
        if (!service) {
            return NextResponse.json({ message: 'Service not found' }, { status: 404 });
        }

        const config = await SaloonConfig.findOne();
        if (!config) {
            return NextResponse.json({ message: 'Saloon configuration not found' }, { status: 404 });
        }

        const start = new Date(startTime);
        const end = addMinutesToDate(start, service.duration);

        const existingAppointments = await Appointment.find({
            date: new Date(date),
            status: { $in: ['scheduled', 'blocked'] },
        });

        for (const appointment of existingAppointments) {
            if (isOverlapping(appointment.startTime, appointment.endTime, start, end)) {
                const isBlocked = appointment.status === 'blocked';
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
            status: body.status || 'scheduled'
        });

        await newAppointment.save();

        return NextResponse.json({
            message: 'Appointment created successfully',
            appointment: newAppointment
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating appointment:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');

        if (!date) {
            return NextResponse.json({ message: "Date is required" }, { status: 400 });
        }

        await dbConnect();
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
