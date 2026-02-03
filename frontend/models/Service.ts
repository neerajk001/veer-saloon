import mongoose, { Schema } from 'mongoose';

const serviceSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    isAcitve: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);
export default Service;
