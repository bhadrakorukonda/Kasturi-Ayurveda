import mongoose from 'mongoose';
import { env } from '../config/env';
import Doctor from '../models/Doctor.model';
import Settings, { SINGLETON_KEY } from '../models/Settings.model';

// Idempotent seed: uses $setOnInsert everywhere so re-running this script
// never overwrites values an admin has since edited in the DB.
const seed = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // minNoticeMins / maxAdvanceDays are placeholders pending the clinic
    // owner's real numbers (see CLAUDE.md "Open decisions").
    const settingsBefore = await Settings.findOne({ key: SINGLETON_KEY });
    const settingsResult = await Settings.findOneAndUpdate(
      { key: SINGLETON_KEY },
      {
        $setOnInsert: {
          key: SINGLETON_KEY,
          consultationPrice: { INR: 50000, USD: 5000 },
          usdEnabled: false,
          minNoticeMins: 120,
          maxAdvanceDays: 30,
          holdMinutes: 10,
          refundWindowHours: 24,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(
      settingsBefore
        ? 'ℹ️  Settings already exist — left untouched'
        : '✅ Settings created with placeholder defaults',
      settingsResult.toObject()
    );

    // Working days/hours (Mon-Sat, 10:00-14:00 & 17:00-21:00 IST) are
    // placeholders pending the doctor's real schedule.
    const doctorBefore = await Doctor.findOne({ name: 'Dr. Saraswathi Sharma' });
    const doctorResult = await Doctor.findOneAndUpdate(
      { name: 'Dr. Saraswathi Sharma' },
      {
        $setOnInsert: {
          name: 'Dr. Saraswathi Sharma',
          specialization: 'General Ayurvedic Physician',
          isActive: true,
          slotDurationMins: 30,
          weeklySchedule: {
            workingDays: [1, 2, 3, 4, 5, 6],
            windows: [
              { start: '10:00', end: '14:00' },
              { start: '17:00', end: '21:00' },
            ],
          },
          blockedDates: [],
          supportsOnline: true,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(
      doctorBefore
        ? 'ℹ️  Doctor "Dr. Saraswathi Sharma" already exists — left untouched'
        : '✅ Doctor "Dr. Saraswathi Sharma" created with placeholder schedule',
      doctorResult.toObject()
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
