import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
    email: string;
    name: string;
    image?: string;
    role: 'user' | 'admin';
    blocked: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
        },
        image: {
            type: String,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        blocked: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Prevent model overwrite in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
