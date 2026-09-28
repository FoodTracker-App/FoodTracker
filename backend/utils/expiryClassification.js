export const DAY_MS = 86_400_000;

export const EXPIRY_BANDS = Object.freeze([
  Object.freeze({ status: "EXPIRED", min: -Infinity, max: -1 }),
  Object.freeze({ status: "TODAY", min: 0, max: 0 }),
  Object.freeze({ status: "DAYS_1_3", min: 1, max: 3 }),
  Object.freeze({ status: "DAYS_4_13", min: 4, max: 13 }),
  Object.freeze({ status: "DAYS_14_PLUS", min: 14, max: Infinity }),
]);

// Inputs are calendar dates represented as UTC midnight, never local instants.
export const classifyExpiry = (expiryDate, today) => {
  const daysRemaining = (expiryDate.getTime() - today.getTime()) / DAY_MS;
  const band = EXPIRY_BANDS.find(
    ({ min, max }) => daysRemaining >= min && daysRemaining <= max,
  );
  return { expiryStatus: band.status, daysRemaining };
};

export const getBandDateRange = (status, today) => {
  const band = EXPIRY_BANDS.find((entry) => entry.status === status);
  if (!band) throw new RangeError("Unknown expiry status.");
  const range = {};
  if (Number.isFinite(band.min)) {
    range.gte = new Date(today.getTime() + band.min * DAY_MS);
  }
  if (Number.isFinite(band.max)) {
    range.lte = new Date(today.getTime() + band.max * DAY_MS);
  }
  return range;
};
