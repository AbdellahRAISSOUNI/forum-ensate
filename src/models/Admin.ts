import mongoose, { Schema, Model } from 'mongoose';

export interface AdminDocument extends mongoose.Document {
    email: string;
    name?: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

const AdminSchema = new Schema<AdminDocument>(
    {
        email: { type: String, required: true, unique: true, index: true },
        name: { type: String },
        passwordHash: { type: String, required: true },
    },
    { timestamps: true }
);

export const Admin: Model<AdminDocument> =
    (mongoose.models.Admin as Model<AdminDocument>) ||
    mongoose.model<AdminDocument>('Admin', AdminSchema);


