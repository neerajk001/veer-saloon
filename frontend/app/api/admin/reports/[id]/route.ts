import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import MonthlyReport from '@/models/MonthlyReport';

/**
 * GET /api/admin/reports/[id]
 * Fetch a single report by its MongoDB _id.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminSession = await requireAdmin();
        if (!adminSession) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await dbConnect();

        const report = await MonthlyReport.findById(id).lean();
        if (!report) {
            return NextResponse.json({ message: 'Report not found' }, { status: 404 });
        }

        return NextResponse.json(report);
    } catch (error) {
        console.error('Error fetching report:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/reports/[id]
 * Delete a report (admin only).
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminSession = await requireAdmin();
        if (!adminSession) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await dbConnect();

        const report = await MonthlyReport.findByIdAndDelete(id);
        if (!report) {
            return NextResponse.json({ message: 'Report not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Report deleted successfully' });
    } catch (error) {
        console.error('Error deleting report:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
