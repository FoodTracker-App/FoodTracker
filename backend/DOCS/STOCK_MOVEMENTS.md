# Stock adjustments

`POST /api/stock-movements` records an authenticated stock adjustment and atomically updates the batch balance. Supply a bearer access token or the session cookie issued by the authentication endpoints.

## Request

```json
{
  "batchId": "8a93c4ef-5264-4d78-bf13-ae357281f241",
  "type": "DAMAGE",
  "quantityChange": -2,
  "reason": "Two units were damaged during handling."
}
```

`batchId` must be a UUID, `type` one of `RECEIPT`, `SALE`, `DAMAGE`, `DISPOSAL`, or `CORRECTION`, and `quantityChange` a non-zero JSON integer within the PostgreSQL integer range. The required reason must contain 5–500 characters after trimming. The authenticated user is always recorded as `performedById`; caller-supplied audit fields are rejected.

## Responses and errors

Success returns `201` with the created stock movement (`id`, `batchId`, `performedById`, `type`, `quantityChange`, `reason`, and `createdAt`).

| Status | Code | Cause |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Invalid or unsupported request field |
| `401` | `UNAUTHORIZED` | Missing or invalid access token |
| `404` | `BATCH_NOT_FOUND` | No batch matches the supplied UUID |
| `409` | `INSUFFICIENT_STOCK` | Adjustment would reduce quantity below zero |
| `409` | `QUANTITY_LIMIT` | Adjustment would exceed the maximum supported quantity |

Batch quantity and movement creation are committed in one database transaction. A concurrent adjustment cannot reduce inventory below zero or exceed the database integer limit.
