import mongoose, { Document, Schema } from 'mongoose';

const SINGLETON_KEY = 'singleton';

export interface IConsultationPrice {
  INR: number;
  USD: number;
}

export interface ISettings extends Document {
  key: string;
  consultationPrice: IConsultationPrice;
  usdEnabled: boolean;
  minNoticeMins: number;
  maxAdvanceDays: number;
  holdMinutes: number;
  refundWindowHours: number;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      default: SINGLETON_KEY,
      unique: true,
      immutable: true,
    },
    consultationPrice: {
      INR: {
        type: Number,
        required: [true, 'consultationPrice.INR is required'],
        min: [1, 'consultationPrice.INR must be a positive integer (paise)'],
      },
      USD: {
        type: Number,
        required: [true, 'consultationPrice.USD is required'],
        min: [1, 'consultationPrice.USD must be a positive integer (cents)'],
      },
    },
    usdEnabled: {
      type: Boolean,
      default: false,
    },
    minNoticeMins: {
      type: Number,
      required: [true, 'minNoticeMins is required'],
      min: [0, 'minNoticeMins cannot be negative'],
    },
    maxAdvanceDays: {
      type: Number,
      required: [true, 'maxAdvanceDays is required'],
      min: [1, 'maxAdvanceDays must be at least 1'],
    },
    holdMinutes: {
      type: Number,
      default: 10,
      min: [1, 'holdMinutes must be at least 1'],
    },
    refundWindowHours: {
      type: Number,
      default: 24,
      min: [0, 'refundWindowHours cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

// Settings is a singleton: always read/write through these helpers so a
// second document is never created.
export const getSettings = async (): Promise<ISettings> => {
  const settings = await Settings.findOne({ key: SINGLETON_KEY });
  if (!settings) {
    throw new Error('Settings have not been seeded yet. Run the seed script.');
  }
  return settings;
};

export const updateSettings = async (
  update: Partial<
    Pick<
      ISettings,
      | 'consultationPrice'
      | 'usdEnabled'
      | 'minNoticeMins'
      | 'maxAdvanceDays'
      | 'holdMinutes'
      | 'refundWindowHours'
    >
  >
): Promise<ISettings> => {
  const settings = await Settings.findOneAndUpdate(
    { key: SINGLETON_KEY },
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!settings) {
    throw new Error('Settings have not been seeded yet. Run the seed script.');
  }
  return settings;
};

export default Settings;
export { SINGLETON_KEY };
