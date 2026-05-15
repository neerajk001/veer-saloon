import mongoose, { Schema } from 'mongoose';

const serviceSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    serviceType: {
        type: String,
        enum: ['single', 'package'],
        default: 'single',
        index: true
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
    // Only for package services. Contains the included single services.
    packageServiceIds: [{
        type: Schema.Types.ObjectId,
        ref: 'Service'
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const existingModel = mongoose.models.Service as mongoose.Model<any> | undefined;
let Service: mongoose.Model<any>;

// During Next.js dev hot reload, an older compiled model can linger in memory.
// If package fields are missing, recreate the model with the latest schema.
if (existingModel) {
    const hasServiceType = !!existingModel.schema.path('serviceType');
    const hasPackageServiceIds = !!existingModel.schema.path('packageServiceIds');
    if (!hasServiceType || !hasPackageServiceIds) {
        delete mongoose.models.Service;
        Service = mongoose.model('Service', serviceSchema);
    } else {
        Service = existingModel;
    }
} else {
    Service = mongoose.model('Service', serviceSchema);
}
export default Service;
