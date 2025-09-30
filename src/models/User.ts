import mongoose, { Schema, Model } from 'mongoose';

export type UserRole = 'student' | 'committee' | 'admin';
export type StudentStatus = 'ENSA' | 'EXTERNE';
export type OpportunityType = 'PFA' | 'PFE' | 'STAGE_OBSERVATION' | 'EMPLOI';

export interface UserDocument extends mongoose.Document {
    name: string;
    email: string;
    password?: string; // stored hashed (new field name)
    passwordHash?: string; // stored hashed (legacy field name)
    role: UserRole;
    status?: StudentStatus; // for students
    opportunityType?: OpportunityType; // for students
    isCommittee?: boolean;
    assignedRooms?: mongoose.Types.ObjectId[]; // for committee members
    isActive?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
    {
        name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
        email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
        password: { type: String }, // New field name
        passwordHash: { type: String }, // Legacy field name
        role: { type: String, required: true, enum: ['student', 'committee', 'admin'] },
        status: { type: String, enum: ['ENSA', 'EXTERNE'], default: undefined },
        opportunityType: { type: String, enum: ['PFA', 'PFE', 'STAGE_OBSERVATION', 'EMPLOI'], default: undefined },
        isCommittee: { type: Boolean, default: false },
        assignedRooms: [{ type: Schema.Types.ObjectId, ref: 'Room' }],
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

UserSchema.path('email').validate((val: string) => /.+@.+\..+/.test(val), 'Invalid email');

// Ensure at least one password field is present
UserSchema.pre('save', function() {
  if (!this.password && !this.passwordHash) {
    throw new Error('Either password or passwordHash must be provided');
  }
});

export const User: Model<UserDocument> =
    (mongoose.models.User as Model<UserDocument>) ||
    mongoose.model<UserDocument>('User', UserSchema);


