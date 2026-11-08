import Appointment from '../models/Appointment.model';

// Frees slots whose payment hold has expired. Called as a lazy check on
// every availability/create read, and as a best-effort periodic job from
// server.ts. isActiveSlot is $unset (not set to false) so the partial
// unique index on { doctorId, slotStart } stops seeing this appointment.
export const expireStaleHolds = async (): Promise<void> => {
  await Appointment.updateMany(
    {
      isActiveSlot: true,
      status: 'pending_payment',
      holdExpiresAt: { $lt: new Date() },
    },
    {
      $set: { status: 'cancelled', cancelledBy: 'system', cancelledAt: new Date() },
      $unset: { isActiveSlot: '', holdExpiresAt: '' },
    }
  );
};
