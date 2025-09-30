import mongoose, { Schema, Model } from 'mongoose';

export type UserRole = 'student' | 'committee';
export type StudentStatus = 'ENSA' | 'EXTERNE';
export type OpportunityType = 'PFA' | 'PFE' | 'STAGE_OBSERVATION' | 'EMPLOI';

export interface UserDocument extends mongoose.Document {
    name: string;
    email: string;
    passwordHash: string; // stored hashed
    role: UserRole;
    status?: StudentStatus; // for students
    opportunityType?: OpportunityType; // for students
    isCommittee: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
    {
        name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
        email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
        passwordHash: { type: String, required: true },
        role: { type: String, required: true, enum: ['student', 'committee'] },
        status: { type: String, enum: ['ENSA', 'EXTERNE'], default: undefined },
        opportunityType: { type: String, enum: ['PFA', 'PFE', 'STAGE_OBSERVATION', 'EMPLOI'], default: undefined },
        isCommittee: { type: Boolean, required: true, default: false },
    },
    { timestamps: true }
);

UserSchema.path('email').validate((val: string) => /.+@.+\..+/.test(val), 'Invalid email');

export const User: Model<UserDocument> =
    (mongoose.models.User as Model<UserDocument>) ||
    mongoose.model<UserDocument>('User', UserSchema);


