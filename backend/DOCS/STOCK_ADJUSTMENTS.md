# Safe Stock Adjustments and Movement History (FET-12)

## Endpoints

Both endpoints require the existing Bearer token or session cookie. They inherit `Cache-Control: no-store`, origin checks, and the shared error envelope. Authentication runs once before the movement and batch routers.

| Method and path | Input | Success |
| --- | --- | --- |
| `POST /api/batches/:id/adjustments` | UUID path; JSON `{ type, quantityChange, reason }` | `201 { batch, movement }` |
| `GET /api/batches/:id/movements` | UUID path; optional `page`, `pageSize` | `200 { items, page, pageSize, total, totalPages }` |

Path validation comes before body/query validation, then batch existence is checked in the service transaction. A valid UUID with valid input but no batch returns `404 BATCH_NOT_FOUND`. Invalid input returns 400 before any database work.

## Adjustment rules

All three fields are required. `quantityChange` must be a JSON number (not a numeric string), a non-zero integer from -1,000,000 to 1,000,000. `reason` is trimmed and must contain 1-500 characters. Unknown fields are rejected, including `performedById`, `batchId`, `quantity`, and `createdAt`. The actor comes exclusively from the authenticated user.

| Type | Sign | Expiry rule |
| --- | --- | --- |
| SALE | Negative | Reject expired stock; stock expiring today may be sold. |
| DAMAGE | Negative | Allowed regardless of expiry. |
| DISPOSAL | Negative | Allowed regardless of expiry. |
| CORRECTION | Positive or negative | Allowed regardless of expiry; resulting stock must remain within capacity. |
| RECEIPT | Not accepted | New deliveries use `POST /api/batches`. |

The store date is captured once per request through FET-15's `getStoreToday()` and classifier. Existing `STORE_TIMEZONE=UTC` uses GMT / UTC+0 year-round. See [EXPIRY.md](./EXPIRY.md). Batch intake and PATCH are unchanged; PATCH still rejects quantity changes. See [BATCHES.md](./BATCHES.md).

### Atomicity and concurrency

An interactive read-committed transaction reads the batch, checks sale expiry, performs one guarded increment, inserts the movement with a generated UUID, and re-reads the updated batch. Every successful adjustment explicitly sets `updatedAt`. Any failure rolls back the increment, timestamp change, and movement together.

Removals require `quantity >= -quantityChange` in the UPDATE predicate. Positive corrections require `quantity >= 0` and `quantity <= 2147483647 - quantityChange`. Limiting the size of one adjustment alone would not prevent overflow near the integer maximum. No read-compute-write quantity assignment is used.

SALE also requires `expiryDate >= today` in the UPDATE predicate. PostgreSQL re-evaluates the guards after waiting for a concurrent update to the row. An expiry PATCH that takes effect first cannot cause a sale to slip past the expiry restriction. A sale that acquires the row first can succeed before a later expiry PATCH; the rule is evaluated in that serialization order, using the captured request date.

A failed guard triggers a fresh read to distinguish a missing batch, expired sale, insufficient stock, and exceeded capacity. If another concurrent change makes the row satisfy the guards again, `409 STOCK_CHANGED` asks the client to reload and retry; the server does not silently retry. A pre-existing negative quantity also fails the positive-correction guard and returns STOCK_CHANGED rather than bypassing the invariant.

There is no idempotency key: repeating a successful request records another adjustment if valid. If a response is lost, inspect current quantity/history before resubmitting.

No database CHECK constraint or migration is added. A future `quantity >= 0` CHECK is recommended as defence in depth against writes outside these endpoints.

## Response shapes

`batch` uses the shared batch list selection and serializer: identifiers, lot, quantity, expiry date, received/updated timestamps, product and location, plus computed `expiryStatus` and `daysRemaining`. It omits creator expansion and movement history. The returned `movement` has exactly the same selection as each history item:

```json
{
  "id": "<movement-uuid>",
  "type": "SALE",
  "quantityChange": -2,
  "reason": "Sold two units",
  "createdAt": "2026-09-28T10:00:00.000Z",
  "performedBy": { "id": "<user-uuid>", "fullName": "Alex Morgan" }
}
```

Actor email and password hash are never selected. Timestamps serialize as ISO strings; expiry dates remain YYYY-MM-DD strings.

History includes the initial RECEIPT, ordered by `createdAt DESC, id DESC` for deterministic newest-first results. Pagination defaults to page 1 and pageSize 20; maximum pageSize is 100. Page must be 1-2,147,483,647, and computed offset must not exceed 2,147,483,647. Unknown/repeated parameters, excessive limits, and invalid pagination return 400. Out-of-range pages preserve totals and return empty items. An existing batch with no movements returns total/totalPages 0; a missing batch returns 404.

Existence, total, and items are read in one repeatable-read transaction. Separate page requests do not freeze history across requests. By design, the signed sum of all movements, including RECEIPT, equals current batch quantity. No reconciliation code is added.

## Errors

All errors use `{ "error": { "code": "...", "message": "..." } }`.

| HTTP | Code | Cause |
| --- | --- | --- |
| 400 | INVALID_ID | Malformed batch UUID; checked before body/query validation. |
| 400 | INVALID_ADJUSTMENT_TYPE | Supplied type is invalid, including RECEIPT. Message directs new deliveries to batch intake. |
| 400 | INVALID_QUANTITY_CHANGE | Supplied change is zero, non-integer, string, outside bounds, or has an invalid sign. |
| 400 | VALIDATION_ERROR | Missing required fields, invalid reason, unknown body/query fields, or invalid pagination. Missing required fields take precedence over supplied invalid type/change values. |
| 404 | BATCH_NOT_FOUND | Batch does not exist. |
| 409 | INSUFFICIENT_STOCK | Removal exceeds available stock. |
| 409 | SALE_ON_EXPIRED_STOCK | SALE targets expired stock. |
| 409 | STOCK_LIMIT_EXCEEDED | Positive correction would exceed 2,147,483,647. |
| 409 | STOCK_CHANGED | Guard failed but fresh state no longer explains the conflict; reload before retrying. Also rejects a pre-existing negative quantity on a positive correction. |
| 409 | REFERENCE_CONFLICT | A referenced record disappeared; the transaction is rolled back. |
| 401 | UNAUTHORIZED | Missing, invalid, expired, or inactive-user authentication. |
| 403 | ORIGIN_FORBIDDEN | Disallowed request origin. |
| 400 | INVALID_JSON | Malformed JSON. |
| 413 | PAYLOAD_TOO_LARGE | Request body exceeds the existing limit. |
| 500 | INTERNAL_ERROR | Unexpected failure; no partial adjustment commits. |

## Manual examples (not executed)

Use existing product/location IDs and an active staff token. Set `baseUrl` and `batchId` in Postman. POST requests require `Content-Type: application/json`; all requests require `Authorization: Bearer <accessToken>` or the session cookie.

For these examples assume store today is 2026-09-28 and a newly received batch has quantity 5 and expiry 2026-10-12. Adapt dates to the actual store day.

### Sale and history

`POST {{baseUrl}}/api/batches/{{batchId}}/adjustments`

```json
{ "type": "SALE", "quantityChange": -2, "reason": "  Sold two units  " }
```

Expected 201 (IDs and timestamps illustrative):

```json
{
  "batch": {
    "id": "<batch-uuid>",
    "productId": "<product-uuid>",
    "locationId": "<location-uuid>",
    "createdById": "<user-uuid>",
    "manufacturerLot": null,
    "quantity": 3,
    "expiryDate": "2026-10-12",
    "receivedAt": "2026-09-28T09:00:00.000Z",
    "updatedAt": "2026-09-28T10:00:00.000Z",
    "product": { "productCode": "RICE-001", "name": "Rice", "stockUnit": "bag" },
    "location": { "name": "Shelf A" },
    "expiryStatus": "DAYS_14_PLUS",
    "daysRemaining": 14
  },
  "movement": {
    "id": "<movement-uuid>",
    "type": "SALE",
    "quantityChange": -2,
    "reason": "Sold two units",
    "createdAt": "2026-09-28T10:00:00.000Z",
    "performedBy": { "id": "<user-uuid>", "fullName": "Alex Morgan" }
  }
}
```

`GET {{baseUrl}}/api/batches/{{batchId}}/movements?page=1&pageSize=1` returns 200 with the SALE item above in `items`, page 1, pageSize 1, total 2, totalPages 2. Page 2 contains the initial RECEIPT with quantityChange 5. Their signed sum is 3. Page 3 returns empty items while preserving total 2 and totalPages 2.

### Other valid adjustments

Apply independently to batches with enough stock:

```json
{ "type": "DAMAGE", "quantityChange": -1, "reason": "Packaging torn" }
```

```json
{ "type": "DISPOSAL", "quantityChange": -1, "reason": "Expired stock removed" }
```

```json
{ "type": "CORRECTION", "quantityChange": 2, "reason": "Physical count correction" }
```

Each returns 201 with quantity adjusted by the signed change and one new movement. CORRECTION with -1 is also valid. Removing the exact available quantity succeeds with quantity 0; inventory/detail still show it while dashboard excludes it.

### Rejection examples

- SALE with `quantityChange: 1`, zero, 0.5, `"-1"`, or -1,000,001 returns 400 INVALID_QUANTITY_CHANGE.
- RECEIPT or lowercase `sale` returns 400 INVALID_ADJUSTMENT_TYPE.
- Missing reason, whitespace-only reason, reason longer than 500 characters, or an added `performedById` returns 400 VALIDATION_ERROR. A 500-character reason is accepted.
- Malformed path UUID returns 400 INVALID_ID even with an invalid body. An absent UUID with otherwise valid input returns 404 BATCH_NOT_FOUND.
- Removing 4 from quantity 3 returns 409 with `{ "error": { "code": "INSUFFICIENT_STOCK", "message": "There is not enough stock for this adjustment." } }`.
- SALE on yesterday's expiry returns 409 SALE_ON_EXPIRED_STOCK; SALE on today's expiry succeeds. DAMAGE, DISPOSAL, and either sign of CORRECTION ignore expiry while still enforcing stock bounds.
- On a batch received with quantity 2,147,483,647, correction +1 returns 409 STOCK_LIMIT_EXCEEDED. On quantity 2,147,483,646, correction +1 succeeds. Use isolated test batches.
- Confirm every rejected request leaves quantity, updatedAt, and movement count unchanged. In a controlled development test, force movement insertion to fail after the update and verify rollback of both quantity and timestamp. Do not introduce a production failure hook.
- Confirm batch PATCH still rejects quantity, ownership is taken from the authenticated user, and no history response exposes actor email/password hash.
- Check missing/invalid sessions, cache headers, unknown/repeated query parameters, maximum pagination, empty results, and timestamp ties ordered by ID descending.

### Two simultaneous removals

1. Receive a fresh, unexpired batch with quantity 5. Confirm history contains only its RECEIPT.
2. Open two Postman tabs for the adjustment URL and send both as close together as possible:

```json
{ "type": "SALE", "quantityChange": -4, "reason": "Concurrent removal A" }
```

```json
{ "type": "SALE", "quantityChange": -4, "reason": "Concurrent removal B" }
```

3. Expect exactly one 201 with quantity 1 and one 409 INSUFFICIENT_STOCK. Either request may win.
4. Confirm final batch quantity 1 and exactly two total movements: RECEIPT +5 and the winning SALE -4. The losing request must not change updatedAt or add a movement.

### Concurrent expiry correction

On an unexpired batch with enough stock, race a SALE against `PATCH /api/batches/:id` changing expiry to yesterday. If the PATCH takes effect first, the SALE must return 409 SALE_ON_EXPIRED_STOCK (or STOCK_CHANGED if further changes occur before diagnosis), with no sale movement. If the SALE obtains the row first, it may commit before the PATCH; this is a valid serialization. For a reproducible check of the race window, use a debugger or controlled database session to pause between the initial read and guarded update; no test-only hooks are added.

## Implementation verification

No endpoint/concurrency tests, seed scripts, schema changes, or new test files are included. Implementation verification uses syntax checks, temporary in-memory validator checks, the existing FET-15 tests, and diff review. Endpoint, rollback, and concurrency scenarios above are for manual execution by the user.
