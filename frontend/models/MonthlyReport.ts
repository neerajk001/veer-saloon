import mongoose, { Schema } from 'mongoose';

const monthlyReportSchema = new Schema({
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12,
    },
    year: {
        type: Number,
        required: true,
    },
    reportPeriod: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
    },
    summary: {
        totalBookings: { type: Number, default: 0 },
        completedBookings: { type: Number, default: 0 },
        cancelledBookings: { type: Number, default: 0 },
        scheduledBookings: { type: Number, default: 0 },
        cancellationRate: { type: Number, default: 0 },
        totalCustomers: { type: Number, default: 0 },
        estimatedRevenue: { type: Number, default: 0 },
    },
    serviceBreakdown: [{
        serviceName: { type: String, required: true },
        bookingCount: { type: Number, default: 0 },
        estimatedRevenue: { type: Number, default: 0 },
    }],
    dailyTrends: [{
        date: { type: String, required: true },
        bookingCount: { type: Number, default: 0 },
        completedCount: { type: Number, default: 0 },
        cancelledCount: { type: Number, default: 0 },
    }],
    bookingsCleanedUp: { type: Boolean, default: false },
    cleanupDate: { type: Date },
    generatedAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['completed', 'failed'],
        default: 'completed',
    },
}, { timestamps: true });

// Prevent duplicate reports for the same month
monthlyReportSchema.index({ year: 1, month: 1 }, { unique: true });

const MonthlyReport = mongoose.models.MonthlyReport || mongoose.model('MonthlyReport', monthlyReportSchema);
export default MonthlyReport;
