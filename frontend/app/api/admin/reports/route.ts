import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import MonthlyReport from '@/models/MonthlyReport';
import Appointment from '@/models/Appointment';
import Service from '@/models/Service';

/**
 * GET /api/admin/reports
 * List all generated monthly reports, newest first.
 */
export async function GET() {
    try {
        const adminSession = await requireAdmin();
        if (!adminSession) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const reports = await MonthlyReport.find({})
            .sort({ year: -1, month: -1 })
            .lean();

        return NextResponse.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/reports
 * Generate a monthly report for the previous month.
 * After successful generation, deletes all appointments from that month.
 *
 * Body (optional): { month?: number, year?: number }
 * If omitted, defaults to the previous calendar month.
 */
export async function POST(req: Request) {
    try {
        const adminSession = await requireAdmin();
        if (!adminSession) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Determine target month
        const body = await req.json().catch(() => ({}));
        let targetYear: number;
        let targetMonth: number; // 1-indexed

        if (body.month && body.year) {
            targetYear = Number(body.year);
            targetMonth = Number(body.month);
        } else {
            // Default: previous month
            const now = new Date();
            const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
            targetYear = prev.getUTCFullYear();
            targetMonth = prev.getUTCMonth() + 1; // 1-indexed
        }

        if (!targetYear || !targetMonth || targetMonth < 1 || targetMonth > 12) {
            return NextResponse.json({ message: 'Invalid month or year' }, { status: 400 });
        }

        // Check for duplicate
        const existing = await MonthlyReport.findOne({ year: targetYear, month: targetMonth });
        if (existing) {
            return NextResponse.json({
                message: `Report for ${targetMonth}/${targetYear} already exists`,
                report: existing,
            }, { status: 409 });
        }

        // Date range for the target month (UTC)
        const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0)); // 1st of next month

        // ─── Aggregate appointment data ──────────────────────────────────
        const appointments = await Appointment.find({
            date: { $gte: monthStart, $lt: monthEnd },
        }).lean();

        if (appointments.length === 0) {
            return NextResponse.json({
                message: `No bookings found for ${targetMonth}/${targetYear}. Nothing to report.`,
            }, { status: 404 });
        }

        // Fetch all services for price lookup
        const serviceIds = new Set<string>();
        for (const apt of appointments) {
            if (apt.serviceIds?.length) {
                for (const sid of apt.serviceIds) serviceIds.add(String(sid));
            }
            if (apt.serviceId) serviceIds.add(String(apt.serviceId));
        }
        const services = await Service.find({ _id: { $in: Array.from(serviceIds) } }).lean();
        const serviceMap = new Map<string, { name: string; price: number }>();
        for (const s of services) {
            serviceMap.set(String(s._id), { name: s.name, price: Number(s.price) || 0 });
        }

        // ─── Summary counts ─────────────────────────────────────────────
        let totalBookings = 0;
        let completedBookings = 0;
        let cancelledBookings = 0;
        let scheduledBookings = 0;
        let estimatedRevenue = 0;
        const uniquePhones = new Set<string>();
        const serviceCountMap = new Map<string, { name: string; count: number; revenue: number }>();
        const dailyMap = new Map<string, { bookings: number; completed: number; cancelled: number }>();

        for (const apt of appointments) {
            totalBookings++;

            if (apt.status === 'completed') completedBookings++;
            else if (apt.status === 'canceled') cancelledBookings++;
            else if (apt.status === 'scheduled') scheduledBookings++;

            if (apt.phoneNumber) uniquePhones.add(apt.phoneNumber);

            // Revenue + service breakdown (skip cancelled bookings for revenue)
            const aptServiceIds = apt.serviceIds?.length
                ? apt.serviceIds.map(String)
                : (apt.serviceId ? [String(apt.serviceId)] : []);

            for (const sid of aptServiceIds) {
                const svc = serviceMap.get(sid);
                if (svc) {
                    const key = svc.name;
                    const entry = serviceCountMap.get(key) || { name: svc.name, count: 0, revenue: 0 };
                    entry.count++;
                    if (apt.status !== 'canceled') {
                        entry.revenue += svc.price;
                        estimatedRevenue += svc.price;
                    }
                    serviceCountMap.set(key, entry);
                }
            }

            // Daily trends
            const dateKey = apt.date
                ? new Date(apt.date).toISOString().split('T')[0]
                : 'unknown';
            const dayEntry = dailyMap.get(dateKey) || { bookings: 0, completed: 0, cancelled: 0 };
            dayEntry.bookings++;
            if (apt.status === 'completed') dayEntry.completed++;
            if (apt.status === 'canceled') dayEntry.cancelled++;
            dailyMap.set(dateKey, dayEntry);
        }

        const cancellationRate = totalBookings > 0
            ? Math.round((cancelledBookings / totalBookings) * 100 * 10) / 10
            : 0;

        // Build arrays
        const serviceBreakdown = Array.from(serviceCountMap.values())
            .map(s => ({
                serviceName: s.name,
                bookingCount: s.count,
                estimatedRevenue: s.revenue,
            }))
            .sort((a, b) => b.bookingCount - a.bookingCount);

        const dailyTrends = Array.from(dailyMap.entries())
            .map(([date, d]) => ({
                date,
                bookingCount: d.bookings,
                completedCount: d.completed,
                cancelledCount: d.cancelled,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // ─── Save report ─────────────────────────────────────────────────
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        const report = await MonthlyReport.create({
            month: targetMonth,
            year: targetYear,
            reportPeriod: {
                startDate: monthStart,
                endDate: new Date(monthEnd.getTime() - 1), // last ms of the month
            },
            summary: {
                totalBookings,
                completedBookings,
                cancelledBookings,
                scheduledBookings,
                cancellationRate,
                totalCustomers: uniquePhones.size,
                estimatedRevenue,
            },
            serviceBreakdown,
            dailyTrends,
            status: 'completed',
            generatedAt: new Date(),
        });

        // ─── Cleanup: delete old bookings ────────────────────────────────
        // Only after the report is safely saved
        let cleanupCount = 0;
        try {
            const deleteResult = await Appointment.deleteMany({
                date: { $gte: monthStart, $lt: monthEnd },
            });
            cleanupCount = deleteResult.deletedCount || 0;

            report.bookingsCleanedUp = true;
            report.cleanupDate = new Date();
            await report.save();
        } catch (cleanupError) {
            console.error('Booking cleanup failed (report is safe):', cleanupError);
            // Report is still saved — cleanup can be retried manually
        }

        return NextResponse.json({
            message: `${monthNames[targetMonth]} ${targetYear} report generated successfully. ${cleanupCount} booking records archived and cleaned up.`,
            report,
        }, { status: 201 });

    } catch (error) {
        console.error('Error generating report:', error);
        if ((error as any)?.code === 11000) {
            return NextResponse.json({
                message: 'Report for this month already exists',
            }, { status: 409 });
        }
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
