import mongoose, { Schema, Model } from 'mongoose';

export interface ForumSettingsDocument extends mongoose.Document {
    forumStartDate: Date;
    forumEndDate: Date;
    isRegistrationOpen: boolean;
    welcomeMessage: string; // French
    createdAt: Date;
    updatedAt: Date;
}

const ForumSettingsSchema = new Schema<ForumSettingsDocument>(
    {
        forumStartDate: { type: Date, required: true },
        forumEndDate: { type: Date, required: true },
        isRegistrationOpen: { type: Boolean, required: true, default: false },
        welcomeMessage: { type: String, required: true, trim: true },
    },
    { timestamps: true }
);

ForumSettingsSchema.path('forumEndDate').validate(function (this: ForumSettingsDocument, val: Date) {
    return !this.forumStartDate || !val || this.forumStartDate <= val;
}, 'forumEndDate must be after forumStartDate');

export const ForumSettings: Model<ForumSettingsDocument> =
    (mongoose.models.ForumSettings as Model<ForumSettingsDocument>) ||
    mongoose.model<ForumSettingsDocument>('ForumSettings', ForumSettingsSchema);


