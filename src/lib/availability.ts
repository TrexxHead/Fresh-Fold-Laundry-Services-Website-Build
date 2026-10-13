export const PICKUP_WINDOWS = [
  "10:00–10:30 a.m.", "11:00–11:30 a.m.", "12:00–12:30 p.m.", "1:00–1:30 p.m.",
  "2:00–2:30 p.m.", "8:00–8:30 p.m.", "9:00–9:30 p.m.", "10:00–10:30 p.m."
] as const;

export const EVENING_WINDOWS = PICKUP_WINDOWS.slice(5);
export const PICKUP_DAY_NUMBERS = new Set([3, 4, 5, 6]); // Wednesday–Saturday

export function isPickupDay(dateIso: string): boolean {
  const date = new Date(`${dateIso}T12:00:00`);
  return !Number.isNaN(date.valueOf()) && PICKUP_DAY_NUMBERS.has(date.getDay());
}

export function slotsForDate(dateIso: string): readonly string[] {
  if (!isPickupDay(dateIso)) return [];
  const date = new Date(`${dateIso}T12:00:00`);
  return date.getDay() === 6 ? PICKUP_WINDOWS.slice(0, 5) : PICKUP_WINDOWS;
}

export function nextAvailableDates(from = new Date(), count = 8): string[] {
  const dates: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  for (let offset = 1; dates.length < count && offset < 60; offset += 1) {
    const candidate = new Date(cursor);
    candidate.setDate(cursor.getDate() + offset);
    const iso = candidate.toISOString().slice(0, 10);
    if (isPickupDay(iso)) dates.push(iso);
  }
  return dates;
}

export function isSlotAllowed(dateIso: string, slot: string): boolean {
  return slotsForDate(dateIso).includes(slot as (typeof PICKUP_WINDOWS)[number]);
}
