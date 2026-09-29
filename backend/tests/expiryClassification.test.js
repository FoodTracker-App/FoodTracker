import test from "node:test";
import assert from "node:assert/strict";
import { classifyExpiry, getBandDateRange, EXPIRY_BANDS, DAY_MS } from "../utils/expiryClassification.js";

const cases = [
  [-1, "EXPIRED"], [0, "TODAY"], [1, "DAYS_1_3"], [3, "DAYS_1_3"],
  [4, "DAYS_4_13"], [13, "DAYS_4_13"], [14, "DAYS_14_PLUS"],
];
// Include month/year/leap-day and DST-season crossings; arithmetic stays date-only.
for (const date of ["2026-09-28", "2026-12-31", "2028-02-28", "2026-03-28"]) {
  const today = new Date(date + "T00:00:00.000Z");
  for (const [daysRemaining, expiryStatus] of cases) {
    test(date + " offset " + daysRemaining + " classifies and matches exactly one range", () => {
      const expiry = new Date(today.getTime() + daysRemaining * DAY_MS);
      assert.deepEqual(classifyExpiry(expiry, today), { expiryStatus, daysRemaining });
      const matching = EXPIRY_BANDS.filter(({ status }) => {
        const range = getBandDateRange(status, today);
        return (range.gte === undefined || expiry >= range.gte)
          && (range.lte === undefined || expiry <= range.lte);
      }).map(({ status }) => status);
      assert.deepEqual(matching, [expiryStatus]);
      assert.equal(today.toISOString(), date + "T00:00:00.000Z");
    });
  }
}

test("open-ended bands cover dates far from today", () => {
  const today = new Date("2026-09-28T00:00:00.000Z");
  assert.deepEqual(Object.keys(getBandDateRange("EXPIRED", today)), ["lte"]);
  assert.deepEqual(Object.keys(getBandDateRange("DAYS_14_PLUS", today)), ["gte"]);
  assert.equal(classifyExpiry(new Date("2000-01-01T00:00:00.000Z"), today).expiryStatus, "EXPIRED");
  assert.equal(classifyExpiry(new Date("2099-01-01T00:00:00.000Z"), today).expiryStatus, "DAYS_14_PLUS");
  assert.throws(() => getBandDateRange("UNKNOWN", today), RangeError);
});
