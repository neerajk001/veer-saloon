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
    // Optional range price support (e.g., 300-400). If present, UI should display the range.
    // Keep legacy `price` populated for backward compatibility.
    priceMin: {
        type: Number,
        required: false
    },
    priceMax: {
        type: Number,
        required: false
    },
    duration: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);
export default Service;
