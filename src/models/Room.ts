import mongoose, { Schema, Model, Types } from 'mongoose';

export interface RoomDocument extends mongoose.Document {
    name: string;
    location: string;
    company?: Types.ObjectId; // Company assigned to this room
    committeeMembers: Types.ObjectId[]; // Users
    currentInterview?: Types.ObjectId; // Interview
    createdAt: Date;
    updatedAt: Date;
}

const RoomSchema = new Schema<RoomDocument>(
    {
        name: { type: String, required: true, trim: true },
        location: { type: String, required: true, trim: true },
        company: { type: Schema.Types.ObjectId, ref: 'Company' },
        committeeMembers: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
        currentInterview: { type: Schema.Types.ObjectId, ref: 'Interview' },
    },
    { timestamps: true }
);

export const Room: Model<RoomDocument> =
    (mongoose.models.Room as Model<RoomDocument>) ||
    mongoose.model<RoomDocument>('Room', RoomSchema);


