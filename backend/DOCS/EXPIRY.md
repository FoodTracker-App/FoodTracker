# Expiry Classification, Filters, and Dashboard (FET-15)

## Store date and bands

Set `STORE_TIMEZONE=UTC` in `backend/.env`. UTC means GMT / UTC+0 year-round, with no daylight-saving adjustment. This required setting is read once at startup and validated with `Intl.DateTimeFormat`; missing, invalid, or numeric-offset values prevent startup. Other valid IANA timezone names are supported. Restart after changing configuration.

Each batch/dashboard request captures the store calendar date once. The calendar year/month/day are represented as UTC midnight, just like PostgreSQL DATE values. Whole-day subtraction therefore has no DST effects. Dates still travel as `YYYY-MM-DD` strings.

| Days remaining | expiryStatus |
| --- | --- |
| Below 0 | `EXPIRED` |
| 0 | `TODAY` |
| 1 through 3 | `DAYS_1_3` |
| 4 through 13 | `DAYS_4_13` |
| 14 or more | `DAYS_14_PLUS` |

One shared set of boundaries drives both classification and database date ranges. No status or days remaining is stored; no migration is required. Every batch returned from POST, PATCH, detail, inventory, or dashboard adds `expiryStatus` and integer `daysRemaining`. Negative values mean days since expiry. Existing fields and creator/movement expansion rules remain unchanged.

## Endpoints and filters

Both `GET /api/batches` and `GET /api/dashboard` require the existing Bearer token or session cookie and return `Cache-Control: no-store`.

| Query parameter | Behavior |
| --- | --- |
| `q` | Trimmed, maximum 100 characters; case-insensitive contains against product code OR name. Blank means no search. |
| `productId` | Optional UUID; exact product match. |
| `locationId` | Optional UUID; exact location match. |
| `status` | Optional exact, case-sensitive band key from the table above. |
| `page` | Integer, default 1, minimum 1, maximum 2,147,483,647. |
| `pageSize` | Integer, default 20, minimum 1, maximum 100. |

All filters combine with AND and run in the database before pagination. Ordering is expiry date ascending then ID ascending. The computed pagination offset must not exceed 2,147,483,647. Unknown/repeated query parameters are rejected. Well-formed nonexistent filter IDs produce empty results. Out-of-range pages return empty items with actual totals.

Inventory preserves `{ items, page, pageSize, total, totalPages }`. Zero-stock batches remain visible in inventory/detail and still receive computed expiry fields. No `inStock` filter is added.

Dashboard returns:

```json
{
  "counts": {
    "EXPIRED": 0,
    "TODAY": 0,
    "DAYS_1_3": 0,
    "DAYS_4_13": 0,
    "DAYS_14_PLUS": 0
  },
  "earliestExpiring": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Counts measure batches, not quantities. Both counts and earliest-expiring items require `quantity > 0`; expired batches appear first. Counts respect ALL active filters, including status. Selecting `TODAY`, for example, makes every other band's count zero. Counts cover the full filtered stock set regardless of page/pageSize. Total is their sum. Five database counts and the list query share one repeatable-read transaction so they agree even during concurrent stock updates. Pagination across separate requests does not freeze inventory.

Errors retain `{ "error": { "code": "...", "message": "..." } }`:

- `400 INVALID_ID`: malformed product/location UUID; takes precedence over invalid status.
- `400 INVALID_FILTER`: invalid status, including blank, lowercase, or repeated values.
- `400 VALIDATION_ERROR`: invalid search/pagination or unknown parameter.
- `401 UNAUTHORIZED`: missing or invalid authentication.

Existing batch errors and PATCH forbidden-quantity precedence are unchanged. See [BATCHES.md](./BATCHES.md) and [AUTH.md](./AUTH.md).

## Manual request examples

These expected results assume the store date is **2026-09-28** and a matching product/location contains exactly these eight batches: one positive-stock batch at each expiry date below, plus a zero-stock batch expiring September 28. Adapt dates to the actual store day when testing. Use existing authenticated test data; no seed script is provided.

| Expiry date | daysRemaining | expiryStatus |
| --- | --- | --- |
| 2026-09-27 | -1 | EXPIRED |
| 2026-09-28 | 0 | TODAY |
| 2026-09-29 | 1 | DAYS_1_3 |
| 2026-10-01 | 3 | DAYS_1_3 |
| 2026-10-02 | 4 | DAYS_4_13 |
| 2026-10-11 | 13 | DAYS_4_13 |
| 2026-10-12 | 14 | DAYS_14_PLUS |

Send `Authorization: Bearer <accessToken>` or the existing session cookie. Replace UUID placeholders with real values.

1. `GET /api/batches?productId=<uuid>&locationId=<uuid>&pageSize=100`: expect 200, eight ordered items, total 8, totalPages 1; zero stock remains present. Each item has the existing batch fields plus the computed fields in the table.
2. `GET /api/dashboard?productId=<uuid>&locationId=<uuid>&pageSize=2`: expect 200 with `counts: { "EXPIRED": 1, "TODAY": 1, "DAYS_1_3": 2, "DAYS_4_13": 2, "DAYS_14_PLUS": 1 }`; earliestExpiring contains the September 27 and positive-stock September 28 batches, page 1, pageSize 2, total 7, totalPages 4.
3. `GET /api/dashboard?productId=<uuid>&locationId=<uuid>&status=TODAY`: expect 200 with `counts: { "EXPIRED": 0, "TODAY": 1, "DAYS_1_3": 0, "DAYS_4_13": 0, "DAYS_14_PLUS": 0 }`; one positive-stock item, total 1, totalPages 1.
4. `GET /api/batches?productId=<uuid>&locationId=<uuid>&status=TODAY`: expect 200 with two items including zero stock, both showing `expiryStatus: "TODAY", daysRemaining: 0`.
5. `GET /api/batches?q=%20milk%20&locationId=<uuid>&status=DAYS_1_3`: expect only matching milk product names/codes in that location, expiring September 29 through October 1. Search is case-insensitive; all conditions must match.
6. `GET /api/dashboard?status=soon`: expect 400 with `{ "error": { "code": "INVALID_FILTER", "message": "status must be a valid expiry status." } }`.
7. `GET /api/dashboard?locationId=bad&status=soon`: expect 400 with `{ "error": { "code": "INVALID_ID", "message": "Location id must be a valid UUID." } }`.
8. `GET /api/dashboard?pageSize=101`: expect 400 VALIDATION_ERROR. A valid filter with no matches returns all five counts as zero and an empty list with total/totalPages 0.
9. `GET /api/batches/<batch-uuid>` for the September 27 batch: expect existing detail fields plus `expiryStatus: "EXPIRED", daysRemaining: -1`.
10. `POST /api/batches` with `{ "productId": "<uuid>", "locationId": "<uuid>", "quantity": 1, "expiryDate": "2026-10-12" }`: expect 201 with `expiryStatus: "DAYS_14_PLUS", daysRemaining: 14` and the existing initialMovement. This changes fixture totals.
11. `PATCH /api/batches/<batch-uuid>` with `{ "expiryDate": "2026-10-02" }`: expect 200 with `expiryStatus: "DAYS_4_13", daysRemaining: 4`; quantity and movement history remain unchanged.

## Verification

Run `npm test` in backend (`npm.cmd test` in Windows PowerShell if script execution is restricted). The single unit file covers the classifier and range builder at -1, 0, 1, 3, 4, 13, and 14 days and proves each boundary matches exactly one band. Additional fixed dates exercise year/month/leap-day and DST-season crossings.

Manually check the examples, empty/out-of-range pages, combined search and IDs, authentication, no-store headers, unknown/repeated params, create/detail/PATCH computed fields, and zero-stock inventory versus dashboard behavior. Zero-stock fixtures must come from existing controlled data; this issue does not add a stock-adjustment endpoint. Verify missing/invalid STORE_TIMEZONE prevents startup, UTC midnight advances the calendar day, and changing a valid configured timezone uses that store's local date. Endpoint verification uses existing manual workflows; no endpoint test files are added.

## Implementation verification results

- All 29 classifier/range unit cases passed; JavaScript syntax and diff whitespace checks passed.
- Ad hoc validation checks passed for trimming, bounds, repeated parameters, status errors, and ID-error precedence.
- Configuration checks passed for missing/invalid timezone rejection, UTC midnight rollover, and local-calendar conversion in New York and London.
- Read-only Prisma and live HTTP checks passed for dashboard/inventory empty responses, authentication, no-store headers, error codes, and out-of-range pagination.
- The configured database had no batches. Populated combined-filter results, zero-stock fixtures, and successful create/detail/PATCH responses still require the manual scenarios above. No inventory was created or modified during verification.

## Changed files

- Added `config/store.js`, `utils/expiryClassification.js`, `utils/batchQuery.js`, and `utils/validateBatchQuery.js`.
- Added dashboard route, controller, and service; updated existing batch controller/service/validators and `index.js`.
- Added `tests/expiryClassification.test.js`; updated `package.json` test script.
- Set `STORE_TIMEZONE=UTC` in local `.env` and `.env.example`.
- Added this document and updated `DOCS/BATCHES.md`.
