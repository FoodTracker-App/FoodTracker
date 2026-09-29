import "dotenv/config";

export const STORE_TIMEZONE = process.env.STORE_TIMEZONE?.trim();
if (!STORE_TIMEZONE) throw new Error("STORE_TIMEZONE is required.");

const createFormatter = () => {
  try {
    // Offset strings are not IANA timezone names, even if Intl accepts them.
    if (/^[+-]/.test(STORE_TIMEZONE)) throw new RangeError();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: STORE_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    throw new Error(
      "STORE_TIMEZONE must be a valid IANA timezone, such as UTC.",
    );
  }
};

const formatter = createFormatter();

export const getStoreToday = () => {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map(({ type, value }) => [type, value]),
  );
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
};
