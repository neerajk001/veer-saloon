import mongoose, { Schema } from "mongoose";

const closureSchema = new Schema({
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true,
        index: true
    },
    isFullDay: {
        type: Boolean,
        default: false
    },
    startTime: {
        type: String, // Format: "HH:mm" - Only relevant if startDate === endDate and !isFullDay
        required: function (this: any) { return !this.isFullDay && this.startDate.getTime() === this.endDate.getTime() }
    },
    endTime: {
        type: String, // Format: "HH:mm"
        required: function (this: any) { return !this.isFullDay && this.startDate.getTime() === this.endDate.getTime() }
    },
    reason: {
        type: String,
        default: 'Shop Closed'
    }
}, { timestamps: true });

const Closure = mongoose.models.Closure || mongoose.model('Closure', closureSchema);
export default Closure;
