import mongoose, { Document, Schema } from 'mongoose';

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface IScheduleWindow {
  start: string;
  end: string;
}

export interface IWeeklySchedule {
  workingDays: number[];
  windows: IScheduleWindow[];
}

export interface IDoctor extends Document {
  name: string;
  specialization: string;
  isActive: boolean;
  slotDurationMins: number;
  weeklySchedule: IWeeklySchedule;
  blockedDates: Date[];
  supportsOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleWindowSchema = new Schema<IScheduleWindow>(
  {
    start: {
      type: String,
      required: [true, 'Window start time is required'],
      match: [HHMM_REGEX, 'start must be in HH:mm format'],
    },
    end: {
      type: String,
      required: [true, 'Window end time is required'],
      match: [HHMM_REGEX, 'end must be in HH:mm format'],
    },
  },
  { _id: false }
);

const weeklyScheduleSchema = new Schema<IWeeklySchedule>(
  {
    workingDays: {
      type: [Number],
      default: [],
      validate: {
        validator: (days: number[]) => days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        message: 'workingDays must contain integers between 0 (Sunday) and 6 (Saturday)',
      },
    },
    windows: {
      type: [scheduleWindowSchema],
      default: [],
      validate: {
        validator: (windows: IScheduleWindow[]) =>
          windows.every((w) => w.start < w.end),
        message: 'each window start time must be before its end time',
      },
    },
  },
  { _id: false }
);

const doctorSchema = new Schema<IDoctor>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
      maxlength: [150, 'Specialization cannot exceed 150 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    slotDurationMins: {
      type: Number,
      default: 30,
      min: [5, 'slotDurationMins must be at least 5'],
    },
    weeklySchedule: {
      type: weeklyScheduleSchema,
      default: () => ({ workingDays: [], windows: [] }),
    },
    blockedDates: {
      type: [Date],
      default: [],
    },
    supportsOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

doctorSchema.index({ isActive: 1 });

export default mongoose.model<IDoctor>('Doctor', doctorSchema);
