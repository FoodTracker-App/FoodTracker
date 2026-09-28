import { classifyExpiry, getBandDateRange } from "./expiryClassification.js";

export const batchSelect = {
  id: true,
  productId: true,
  locationId: true,
  createdById: true,
  manufacturerLot: true,
  quantity: true,
  expiryDate: true,
  receivedAt: true,
  updatedAt: true,
  product: { select: { productCode: true, name: true, stockUnit: true } },
  location: { select: { name: true } },
};

export const batchOrderBy = [{ expiryDate: "asc" }, { id: "asc" }];

export const serializeBatch = (batch, today) => ({
  ...batch,
  expiryDate: batch.expiryDate.toISOString().slice(0, 10),
  ...classifyExpiry(batch.expiryDate, today),
});

export const buildBatchWhere = (
  { q, productId, locationId, status },
  today,
) => {
  const where = {};
  if (productId !== undefined) where.productId = productId;
  if (locationId !== undefined) where.locationId = locationId;
  if (q) {
    where.product = {
      is: {
        OR: [
          { productCode: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
    };
  }
  if (status !== undefined) where.expiryDate = getBandDateRange(status, today);
  return where;
};
