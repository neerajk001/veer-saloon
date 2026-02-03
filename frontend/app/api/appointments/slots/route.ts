import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';
import SaloonConfig from '@/models/SaloonConfig';
import Appointment from '@/models/Appointment';
import { addMinutesToDate, isOverlapping } from '@/utils/time.utils';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');
        const serviceId = searchParams.get('serviceId');

        if (!date || !serviceId) {
            return NextResponse.json({ message: "Missing date or serviceId" }, { status: 400 });
        }

        await dbConnect();
        const [service, config, appointments] = await Promise.all([
            Service.findById(serviceId),
            SaloonConfig.findOne(),
            Appointment.find({
                date: new Date(date),
                status: { $in: ["scheduled", "blocked"] }
            })
        ]);

        if (!service) {
            return NextResponse.json({ message: "Service not found" }, { status: 404 });
        }

        if (!config) {
            return NextResponse.json({ message: "Saloon configuration not found" }, { status: 404 });
        }

        const slotDuration = service.duration;
        const SLOT_INTERVAL = 5;

        const allSlots: Array<{ time: Date; available: boolean }> = [];
        const slots: Date[] = [];

        const canFitService = (slotStart: Date): boolean => {
            const slotEnd = addMinutesToDate(slotStart, slotDuration);
            for (const appt of appointments) {
                if (isOverlapping(appt.startTime, appt.endTime, slotStart, slotEnd)) {
                    return false;
                }
            }
            return true;
        };

        const generateSlotsForWindow = (startTime: string, endTime: string) => {
            const timeZoneOffset = "+05:30";
            const dayStart = new Date(`${date}T${startTime}:00${timeZoneOffset}`);
            const dayEnd = new Date(`${date}T${endTime}:00${timeZoneOffset}`);
            let current = new Date(dayStart);

            while (true) {
                const serviceEnd = addMinutesToDate(current, slotDuration);
                if (serviceEnd > dayEnd) break;

                const available = canFitService(current);

                allSlots.push({
                    time: new Date(current),
                    available
                });

                if (available) {
                    slots.push(new Date(current));
                }

                current = addMinutesToDate(current, SLOT_INTERVAL);
            }
        };

        if (config.morningSlot) {
            generateSlotsForWindow(config.morningSlot.openingTime, config.morningSlot.closingTime);
        }
        if (config.eveningSlot) {
            generateSlotsForWindow(config.eveningSlot.openingTime, config.eveningSlot.closingTime);
        }

        return NextResponse.json({
            date,
            serviceId,
            availableSlots: slots,
            allSlots
        });

    } catch (error) {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
