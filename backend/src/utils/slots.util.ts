import { IDoctor } from '../models/Doctor.model';
import { ISettings } from '../models/Settings.model';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface ISlot {
  start: Date;
  end: Date;
}

const parseHHMM = (value: string): { hours: number; minutes: number } => {
  const [hours, minutes] = value.split(':').map(Number);
  return { hours, minutes };
};

// Asia/Kolkata is a fixed UTC+5:30 offset with no DST, so converting an
// IST wall-clock time on a given calendar date to a UTC instant is plain
// arithmetic: build the instant as if it were UTC, then subtract the offset.
const istWallClockToUtc = (dateIST: string, hours: number, minutes: number): Date => {
  const [year, month, day] = dateIST.split('-').map(Number);
  const asIfUtc = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  return new Date(asIfUtc - IST_OFFSET_MS);
};

const isSameISTCalendarDay = (date: Date, dateIST: string): boolean => {
  const istInstant = new Date(date.getTime() + IST_OFFSET_MS);
  const y = istInstant.getUTCFullYear();
  const m = String(istInstant.getUTCMonth() + 1).padStart(2, '0');
  const d = String(istInstant.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}` === dateIST;
};

// Day of week (0=Sunday .. 6=Saturday) for a YYYY-MM-DD date as interpreted
// in Asia/Kolkata (noon UTC avoids any ambiguity near midnight boundaries).
const getISTWeekday = (dateIST: string): number => {
  const [year, month, day] = dateIST.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
};

// Which IST calendar date (YYYY-MM-DD) a UTC instant falls on — the inverse
// of istWallClockToUtc, used to find the slot grid a client-chosen
// slotStart should belong to.
export const utcToISTDateString = (date: Date): string => {
  const istInstant = new Date(date.getTime() + IST_OFFSET_MS);
  const y = istInstant.getUTCFullYear();
  const m = String(istInstant.getUTCMonth() + 1).padStart(2, '0');
  const d = String(istInstant.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const generateDaySlots = (doctor: IDoctor, dateIST: string): ISlot[] => {
  const weekday = getISTWeekday(dateIST);
  if (!doctor.weeklySchedule.workingDays.includes(weekday)) {
    return [];
  }

  const isBlocked = doctor.blockedDates.some((blocked) => isSameISTCalendarDay(blocked, dateIST));
  if (isBlocked) {
    return [];
  }

  const slots: ISlot[] = [];
  const durationMs = doctor.slotDurationMins * 60 * 1000;

  for (const window of doctor.weeklySchedule.windows) {
    const { hours: startH, minutes: startM } = parseHHMM(window.start);
    const { hours: endH, minutes: endM } = parseHHMM(window.end);

    let slotStart = istWallClockToUtc(dateIST, startH, startM);
    const windowEnd = istWallClockToUtc(dateIST, endH, endM);

    while (slotStart.getTime() + durationMs <= windowEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + durationMs);
      slots.push({ start: slotStart, end: slotEnd });
      slotStart = slotEnd;
    }
  }

  return slots;
};

export const isSlotWithinBookingWindow = (
  slotStart: Date,
  settings: ISettings,
  now: Date = new Date()
): boolean => {
  const minNoticeMs = settings.minNoticeMins * 60 * 1000;
  const maxAdvanceMs = settings.maxAdvanceDays * 24 * 60 * 60 * 1000;

  const earliest = now.getTime() + minNoticeMs;
  const latest = now.getTime() + maxAdvanceMs;

  return slotStart.getTime() >= earliest && slotStart.getTime() <= latest;
};
