import mongoose, { Schema, Model, Types } from 'mongoose';

export interface CompanyDocument extends mongoose.Document {
    name: string;
    sector: string;
    website?: string;
    estimatedInterviewDuration?: number; // minutes
    room?: Types.ObjectId;
    logo?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CompanySchema = new Schema<CompanyDocument>(
    {
        name: { type: String, required: true, trim: true },
        sector: { type: String, required: true, trim: true },
        website: { type: String, trim: true },
        estimatedInterviewDuration: { type: Number, min: 1, max: 8 * 60 },
        room: { type: Schema.Types.ObjectId, ref: 'Room' },
        logo: { type: String },
        isActive: { type: Boolean, required: true, default: true },
    },
    { timestamps: true }
);

CompanySchema.path('website').validate((val: string) => !val || /^https?:\/\//i.test(val), 'Invalid website URL');

export const Company: Model<CompanyDocument> =
    (mongoose.models.Company as Model<CompanyDocument>) ||
    mongoose.model<CompanyDocument>('Company', CompanySchema);


