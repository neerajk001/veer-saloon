import mongoose, { Schema } from "mongoose";

const appointmentSchema = new Schema({
    customername: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'canceled', 'blocked'],
        default: 'scheduled'
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    }
}, { timestamps: true });

// Compound indexes for common query patterns
appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ userEmail: 1, date: 1, status: 1 });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
export default Appointment;
