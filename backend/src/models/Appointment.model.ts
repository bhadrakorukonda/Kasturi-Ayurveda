import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPatient {
  name: string;
  phone: string;
  email?: string;
  age?: number;
  symptoms?: string;
}

export interface IAppointment extends Document {
  doctorId: Types.ObjectId;
  slotStart: Date;
  slotEnd: Date;
  kind: 'consultation' | 'therapy_session';
  title?: string;
  mode: 'in_person' | 'online';
  paymentMode: 'pay_now' | 'pay_at_clinic';
  currency: 'INR';
  amountDue: number;
  amountPaid: number;
  amountRefunded: number;
  paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'failed' | 'needs_manual_refund';
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  isActiveSlot?: boolean;
  holdExpiresAt?: Date;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpayRefundId?: string;
  meetLink?: string;
  patient: IPatient;
  consentAcceptedAt?: Date;
  accessTokenHash: string;
  cancelledAt?: Date;
  cancelledBy?: 'patient' | 'admin' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    age: {
      type: Number,
      min: [1, 'Age must be at least 1'],
      max: [150, 'Age must be less than 150'],
    },
    symptoms: {
      type: String,
      trim: true,
      maxlength: [500, 'Symptoms cannot exceed 500 characters'],
    },
  },
  { _id: false }
);

const appointmentSchema = new Schema<IAppointment>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'doctorId is required'],
    },
    slotStart: {
      type: Date,
      required: [true, 'slotStart is required'],
    },
    slotEnd: {
      type: Date,
      required: [true, 'slotEnd is required'],
    },
    kind: {
      type: String,
      enum: ['consultation', 'therapy_session'],
      default: 'consultation',
    },
    title: {
      type: String,
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    mode: {
      type: String,
      enum: ['in_person', 'online'],
      required: [true, 'mode is required'],
    },
    paymentMode: {
      type: String,
      enum: ['pay_now', 'pay_at_clinic'],
      required: [true, 'paymentMode is required'],
    },
    currency: {
      type: String,
      enum: ['INR'],
      default: 'INR',
    },
    amountDue: {
      type: Number,
      required: [true, 'amountDue is required'],
      min: [0, 'amountDue cannot be negative'],
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, 'amountPaid cannot be negative'],
    },
    amountRefunded: {
      type: Number,
      default: 0,
      min: [0, 'amountRefunded cannot be negative'],
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded', 'failed', 'needs_manual_refund'],
      default: 'unpaid',
    },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show'],
      required: [true, 'status is required'],
    },
    isActiveSlot: {
      type: Boolean,
    },
    holdExpiresAt: {
      type: Date,
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpayRefundId: {
      type: String,
    },
    meetLink: {
      type: String,
    },
    patient: {
      type: patientSchema,
      required: [true, 'patient details are required'],
    },
    consentAcceptedAt: {
      type: Date,
    },
    accessTokenHash: {
      type: String,
      required: [true, 'accessTokenHash is required'],
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'admin', 'system'],
    },
  },
  {
    timestamps: true,
  }
);

// The double-booking guard: only one active (pending_payment/confirmed)
// appointment per doctor per slot. isActiveSlot is unset (not false) on
// every inactive appointment so the partial index only ever sees real holds.
appointmentSchema.index(
  { doctorId: 1, slotStart: 1 },
  { unique: true, partialFilterExpression: { isActiveSlot: true } }
);
appointmentSchema.index({ holdExpiresAt: 1 });
appointmentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
appointmentSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });

export default mongoose.model<IAppointment>('Appointment', appointmentSchema);
