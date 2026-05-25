import { MIN_BOOKING_LEAD_TIME_MINUTES, TIME_SLOTS } from "../constants/index.js";

export function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function isSlotPassed(slotTime) {
  const slotMinutes = timeToMinutes(slotTime);
  const currentMinutes = getCurrentTimeMinutes();
  return currentMinutes + MIN_BOOKING_LEAD_TIME_MINUTES > slotMinutes;
}

export function getPassedSlotsForToday() {
  return TIME_SLOTS.filter((slot) => isSlotPassed(slot));
}
