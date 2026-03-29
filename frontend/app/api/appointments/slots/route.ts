import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';
import SaloonConfig from '@/models/SaloonConfig';
import Appointment from '@/models/Appointment';
import Closure from '@/models/Closure';
import { addMinutesToDate, isOverlapping } from '@/utils/time.utils';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');
        const serviceId = searchParams.get('serviceId');

        if (!date || !serviceId) {
            return NextResponse.json({ message: "Missing date or serviceId" }, { status: 400 });
        }

        await dbConnect();

        // Use UTC midnight for calendar day so we match closures stored by block-slot
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');

        // --- NEW: CHECK FOR MAX 2 ACTIVE BOOKINGS RULE ---
        if (session?.user?.email) {
            // Case-insensitive email comparison for reliable count
            const activeCount = await Appointment.countDocuments({
                userEmail: { $regex: new RegExp(`^${session.user.email}$`, 'i') },
                date: { $gte: startOfDay, $lte: endOfDay },
                status: 'scheduled'
            });

            if (activeCount >= 2) {
                return NextResponse.json({
                    date,
                    serviceId,
                    availableSlots: [],
                    allSlots: [],
                    reason: "Limit reached: You can have max 2 active bookings per day."
                });
            }
        }
        // --------------------------------------------------

        // Find closures that overlap this day (works for UTC or local-time stored dates)
        const closures = await Closure.find({
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        });

        const [service, config, appointments] = await Promise.all([
            Service.findById(serviceId),
            SaloonConfig.findOne(),
            Appointment.find({
                date: { $gte: startOfDay, $lte: endOfDay },
                status: { $in: ["scheduled", "blocked"] }
            })
        ]);

        if (!service) {
            return NextResponse.json({ message: "Service not found" }, { status: 404 });
        }

        if (!config) {
            return NextResponse.json({ message: "Saloon configuration not found" }, { status: 404 });
        }

        // Check weekly days off (e.g. Sunday, Monday from settings)
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const queryDayName = dayNames[new Date(date).getDay()];
        const daysOff = (config.daysOff || []).map((d: string) => String(d).trim().toLowerCase());
        if (daysOff.length && daysOff.includes(queryDayName.toLowerCase())) {
            return NextResponse.json({
                date,
                serviceId,
                availableSlots: [],
                allSlots: [],
                reason: `Closed on ${queryDayName}s`
            });
        }

        // Check if fully closed by ANY closure
        const fullDayClosure = closures.find(c => c.isFullDay);
        if (fullDayClosure) {
            return NextResponse.json({
                date,
                serviceId,
                availableSlots: [],
                allSlots: [],
                reason: fullDayClosure.reason || "Shop Closed"
            });
        }

        const slotDuration = service.duration;
        const SLOT_INTERVAL = 5;

        const allSlots: Array<{ time: Date; available: boolean }> = [];
        const slots: Date[] = [];

        // Parse "HH:mm" in same timezone as slot generation (+05:30) so overlap check is correct
        const timeZoneOffset = "+05:30";
        const parseTimeStr = (timeStr: string) => new Date(`${date}T${timeStr}:00${timeZoneOffset}`);

        const canFitService = (slotStart: Date): boolean => {
            const slotEnd = addMinutesToDate(slotStart, slotDuration);

            // Check existing appointments overlap
            for (const appt of appointments) {
                if (isOverlapping(appt.startTime, appt.endTime, slotStart, slotEnd)) {
                    return false;
                }
            }

            // Check partial closure overlaps
            for (const closure of closures) {
                if (!closure.isFullDay && closure.startTime && closure.endTime) {
                    const closeStart = parseTimeStr(closure.startTime);
                    const closeEnd = parseTimeStr(closure.endTime);

                    // If the service slot interferes with the closure time
                    if (isOverlapping(closeStart, closeEnd, slotStart, slotEnd)) {
                        return false;
                    }
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
