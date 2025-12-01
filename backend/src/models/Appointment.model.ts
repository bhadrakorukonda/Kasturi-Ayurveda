import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  name: string;
  email?: string;
  phone: string;
  appointmentDate: Date;
  appointmentTime: string;
  service: string;
  preferredDoctor?: string;
  symptoms?: string;
  age?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    appointmentTime: {
      type: String,
      required: [true, 'Appointment time is required'],
    },
    service: {
      type: String,
      required: [true, 'Service is required'],
      enum: [
        'Consultation',
        'Panchakarma',
        'Ayurvedic Therapy',
        'Diet & Nutrition Plan',
        'Abhyanga',
        'Shirodhara',
        'Kati Vasti',
        'Greeva Vasti',
        'Janu Vasti',
        'Other'
      ],
    },
    preferredDoctor: {
      type: String,
      trim: true,
    },
    symptoms: {
      type: String,
      trim: true,
      maxlength: [500, 'Symptoms cannot exceed 500 characters'],
    },
    age: {
      type: Number,
      min: [1, 'Age must be at least 1'],
      max: [150, 'Age must be less than 150'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
appointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 });
appointmentSchema.index({ email: 1 });
appointmentSchema.index({ phone: 1 });
appointmentSchema.index({ status: 1 });

export default mongoose.model<IAppointment>('Appointment', appointmentSchema);
