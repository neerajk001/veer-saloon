import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAdmin } from "@/lib/adminAuth";
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Service from '@/models/Service';
import SaloonConfig from '@/models/SaloonConfig';
import { addMinutesToDate, escapeRegex } from '@/utils/time.utils';

// Indian phone: 10 digits starting with 6-9
const PHONE_REGEX = /^[6-9]\d{9}$/;

const getUtcDayRange = (dateStr: string) => {
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(dayStart.getTime())) {
        return null;
    }
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return { dayStart, dayEnd };
};

export async function POST(req: Request) {
    await dbConnect();

    try {
        const nextAuthSession = await getServerSession(authOptions);
        if (!nextAuthSession) {
            return NextResponse.json({ message: "Unauthorized. Please sign in to book." }, { status: 401 });
        }

        const body = await req.json();
        const { customername, date, serviceId, serviceIds, phoneNumber, startTime } = body;

        const parsedServiceIds: string[] = Array.isArray(serviceIds)
            ? serviceIds.map(String)
            : (typeof serviceIds === 'string' ? serviceIds.split(',') : []);

        const serviceIdsList = parsedServiceIds.map(s => s.trim()).filter(Boolean);
        if (serviceId && serviceIdsList.length === 0) serviceIdsList.push(String(serviceId));

        if (!customername || !date || serviceIdsList.length === 0 || !phoneNumber || !startTime) {
            return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
        }

        // Sanitize customer name
        const sanitizedName = String(customername).trim().slice(0, 100);
        if (!sanitizedName) {
            return NextResponse.json({ message: 'Invalid customer name' }, { status: 400 });
        }

        // Validate phone number
        const cleanPhone = String(phoneNumber).trim();
        if (!PHONE_REGEX.test(cleanPhone)) {
            return NextResponse.json({ message: 'Invalid phone number. Must be 10 digits starting with 6-9.' }, { status: 400 });
        }

        const services = await Service.find({ _id: { $in: serviceIdsList } });
        if (!services || services.length !== serviceIdsList.length) {
            return NextResponse.json({ message: 'Service not found' }, { status: 404 });
        }

        const config = await SaloonConfig.findOne();
        if (!config) {
            return NextResponse.json({ message: 'Saloon configuration not found' }, { status: 404 });
        }

        const dayRange = getUtcDayRange(String(date));
        if (!dayRange) {
            return NextResponse.json({ message: 'Invalid date' }, { status: 400 });
        }
        const { dayStart, dayEnd } = dayRange;

        // --- MAX 2 ACTIVE BOOKINGS PER DAY RULE ---
        const userEmail = nextAuthSession.user?.email;
        const escapedEmail = escapeRegex(userEmail || '');
        const activeCount = await Appointment.countDocuments({
            userEmail: { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
            date: {
                $gte: dayStart,
                $lt: dayEnd
            },
            status: 'scheduled'
        });

        if (activeCount >= 2) {
            return NextResponse.json({ 
                message: 'Limit reached: You can have max 2 active bookings per day.' 
            }, { status: 403 });
        }
        // ----------------------------------------------

        const totalDuration = services.reduce((sum, s: any) => sum + (Number(s.duration) || 0), 0);
        if (!totalDuration || totalDuration <= 0) {
            return NextResponse.json({ message: 'Invalid service duration' }, { status: 400 });
        }

        const start = new Date(startTime);
        if (isNaN(start.getTime())) {
            return NextResponse.json({ message: 'Invalid start time' }, { status: 400 });
        }
        if (start < dayStart || start >= dayEnd) {
            return NextResponse.json({ message: 'Start time does not match selected date' }, { status: 400 });
        }
        
        // --- Prevent booking expired/past slots dynamically ---
        if (start <= new Date()) {
            return NextResponse.json({ message: 'Cannot book past time slots' }, { status: 400 });
        }
        
        const end = addMinutesToDate(start, totalDuration);

        // =====================================================================
        // OVERLAP CHECK — MongoDB query-level (not an in-memory JS loop).
        // Two time ranges [A_start, A_end) and [B_start, B_end) overlap iff
        //   A_start < B_end  AND  A_end > B_start
        // This runs as a single indexed query against the appointments collection.
        // =====================================================================
        const overlapFilter = {
            date: { $gte: dayStart, $lt: dayEnd },
            status: { $in: ['scheduled', 'blocked', 'completed'] },
            startTime: { $lt: end },   // existing starts before new ends
            endTime:   { $gt: start }, // existing ends after new starts
        };

        const existingConflict = await Appointment.findOne(overlapFilter).lean();

        if (existingConflict) {
            const isBlocked = (existingConflict as any).status === 'blocked';
            return NextResponse.json({
                message: isBlocked ? 'This time slot is blocked by admin' : 'This time slot is already booked',
                conflict: true,
                isBlocked
            }, { status: 409 });
        }

        // --- INSERT the appointment ---
        const newAppointment = new Appointment({
            customername: sanitizedName,
            date: dayStart,
            serviceId: serviceIdsList[0], // keep legacy field for compatibility
            serviceIds: serviceIdsList,
            phoneNumber: cleanPhone,
            startTime: start,
            endTime: end,
            status: 'scheduled', // Never trust client-provided status
            userEmail: userEmail
        });

        await newAppointment.save();

        // =====================================================================
        // POST-INSERT RACE-CONDITION GUARD
        // On Atlas free tier (M0) there are no multi-document transactions, so
        // two concurrent requests could both pass the pre-check above and both
        // insert.  We catch that here: query again for any OTHER active booking
        // that overlaps our new time range.  If found, the booking with the
        // earlier ObjectId (created first) wins; the later one rolls itself back.
        // =====================================================================
        const racingConflicts = await Appointment.find({
            ...overlapFilter,
            _id: { $ne: newAppointment._id },
        }).select('_id').lean();

        if (racingConflicts.length > 0) {
            // Determine if we lose the race (our _id is larger = created later)
            const weCreatedLater = racingConflicts.some(
                (c: any) => newAppointment._id.toString() > c._id.toString()
            );

            if (weCreatedLater) {
                // We lost — roll back our insert
                await Appointment.findByIdAndDelete(newAppointment._id);
                return NextResponse.json({
                    message: 'This time slot was just booked by someone else. Please choose another time.',
                    conflict: true,
                    isBlocked: false
                }, { status: 409 });
            }
            // We won the race (our _id is smaller). The other concurrent
            // request's own post-insert guard will delete its document.
        }

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

            const escapedEmail = escapeRegex(userEmail);
            const appointments = await Appointment.find({
                userEmail: { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
                status: { $in: ['scheduled'] } // only active/upcoming
            })
                .sort({ startTime: 1 })
                .populate('serviceIds', 'name duration price priceMin priceMax')
                .populate('serviceId', 'name duration price priceMin priceMax');

            return NextResponse.json(appointments);
        }

        // --- ADMIN: fetch all (export) — requires admin auth ---
        const exportAll = searchParams.get('export');
        if (exportAll === 'true') {
            const adminSession = await requireAdmin();
            if (!adminSession) {
                return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
            }
            const appointments = await Appointment.find({})
                .sort({ date: -1, startTime: 1 })
                .populate("serviceIds", "name duration price priceMin priceMax")
                .populate("serviceId", "name duration price priceMin priceMax");
            return NextResponse.json(appointments);
        }

        // --- ADMIN: fetch by date ---
        if (!date) {
            return NextResponse.json({ message: "Date, userEmail, or export flag is required" }, { status: 400 });
        }

        // Use range query for consistent date matching
        const dayStart = new Date(date + 'T00:00:00.000Z');
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        const appointments = await Appointment.find({
            date: { $gte: dayStart, $lt: dayEnd }
        })
            .sort({ startTime: 1 })
            .populate("serviceIds", "name duration price priceMin priceMax")
            .populate("serviceId", "name duration price priceMin priceMax");

        return NextResponse.json(appointments);

    } catch (error) {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
