import { Schema } from "mongoose";
import mongoose from "mongoose";

const appointmentSchema = new Schema({
    customername: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
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

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
