import mongoose, { Schema, Model, Types } from 'mongoose';

export type InterviewStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface InterviewDocument extends mongoose.Document {
    student: Types.ObjectId; // User
    company: Types.ObjectId; // Company
    status: InterviewStatus;
    queuePosition: number;
    priority: number;
    scheduledTime?: Date;
    startedAt?: Date;
    completedAt?: Date;
    notificationSent: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const InterviewSchema = new Schema<InterviewDocument>(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
        status: { type: String, enum: ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'WAITING', index: true },
        queuePosition: { type: Number, required: true, min: 0 },
        priority: { type: Number, required: true, min: 0, default: 0 },
        scheduledTime: { type: Date },
        startedAt: { type: Date },
        completedAt: { type: Date },
        notificationSent: { type: Boolean, default: false },
    },
    { timestamps: true }
);

InterviewSchema.index({ company: 1, queuePosition: 1 }, { unique: true, partialFilterExpression: { queuePosition: { $type: 'number' } } });

export const Interview: Model<InterviewDocument> =
    (mongoose.models.Interview as Model<InterviewDocument>) ||
    mongoose.model<InterviewDocument>('Interview', InterviewSchema);


