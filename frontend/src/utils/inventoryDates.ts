export type ExpiryBucket = "expired" | "today" | "soon" | "later";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarDayNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
}

export function daysUntil(expiryDate: string, today: string) {
  return calendarDayNumber(expiryDate) - calendarDayNumber(today);
}

export function getExpiryBucket(days: number): ExpiryBucket {
  if (days < 0) return "expired";
  if (days === 0) return "today";
  if (days <= 3) return "soon";
  return "later";
}

export function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function expiryCopy(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  return `In ${days}d`;
}
