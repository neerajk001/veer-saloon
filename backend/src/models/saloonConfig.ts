import { Schema } from 'mongoose';
import mongoose from 'mongoose';


const saloonConfigSchema = new Schema({
    morningSlot: {
        openingTime: {
            type: String,
            required: true,
            default: '09:00'
        },
        closingTime: {
            type: String,
            required: true,
            default: '14:00'
        }
    },
    eveningSlot: {
        openingTime: {
            type: String,
            required: true,
            default: '16:00'
        },
        closingTime: {
            type: String,
            required: true,
            default: '22:00'
        }
    },
    daysOff: {
        type: [String],
        required: true,
        default: []
    }
}, { timestamps: true });

const SaloonConfig = mongoose.model('SaloonConfig', saloonConfigSchema);
export default SaloonConfig;

