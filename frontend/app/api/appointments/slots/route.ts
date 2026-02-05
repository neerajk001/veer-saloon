import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';
import SaloonConfig from '@/models/SaloonConfig';
import Appointment from '@/models/Appointment';
import Closure from '@/models/Closure';
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

        // Normalize date to start of day for accurate querying
        const queryDate = new Date(date);
        const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));

        // Find any closure that covers this day
        // Logic: active if (ClosureStart <= QueryDate) AND (ClosureEnd >= QueryDate)
        const closure = await Closure.findOne({
            startDate: { $lte: startOfDay },
            endDate: { $gte: startOfDay }
        });

        const [service, config, appointments] = await Promise.all([
            Service.findById(serviceId),
            SaloonConfig.findOne(),
            Appointment.find({
                date: { $gte: startOfDay, $lte: new Date(queryDate.setHours(23, 59, 59, 999)) },
                status: { $in: ["scheduled", "blocked"] }
            })
        ]);

        if (!service) {
            return NextResponse.json({ message: "Service not found" }, { status: 404 });
        }

        if (!config) {
            return NextResponse.json({ message: "Saloon configuration not found" }, { status: 404 });
        }

        // Check if fully closed
        if (closure && closure.isFullDay) {
            return NextResponse.json({
                date,
                serviceId,
                availableSlots: [],
                allSlots: [],
                reason: closure.reason || "Shop Closed"
            });
        }

        const slotDuration = service.duration;
        const SLOT_INTERVAL = 5;

        const allSlots: Array<{ time: Date; available: boolean }> = [];
        const slots: Date[] = [];

        // Helper to parse "HH:mm" to Date for the current day
        const parseTimeStr = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const d = new Date(date);
            d.setHours(hours, minutes, 0, 0);
            return d;
        };

        const canFitService = (slotStart: Date): boolean => {
            const slotEnd = addMinutesToDate(slotStart, slotDuration);

            // Check existing appointments overlap
            for (const appt of appointments) {
                if (isOverlapping(appt.startTime, appt.endTime, slotStart, slotEnd)) {
                    return false;
                }
            }

            // Check partial closure overlap
            if (closure && !closure.isFullDay && closure.startTime && closure.endTime) {
                const closeStart = parseTimeStr(closure.startTime);
                const closeEnd = parseTimeStr(closure.endTime);

                // If the service slot interferes with the closure time
                if (isOverlapping(closeStart, closeEnd, slotStart, slotEnd)) {
                    return false;
                }
            }

            return true;
        };

        const generateSlotsForWindow = (startTime: string, endTime: string) => {
            // Note: date input is assumed to be YYYY-MM-DD
            // Constructing Date with time string directly might be timezone sensitive.
            // Using logic consistent with existing code, but ensuring we stick to the requested 'date'.

            // Existing logic uses explicit timezone offset in string, let's keep it but verify format
            // Assuming config times are like "09:00"

            const timeZoneOffset = "+05:30"; // Existing hardcoded offset
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
        console.error("Slots Error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
