import { randomUUID } from "node:crypto";
import { prisma } from "../config/db.js";
import { batchSelect, serializeBatch } from "../utils/batchQuery.js";
import { classifyExpiry } from "../utils/expiryClassification.js";
import { httpError } from "../utils/errors.js";

const MAX_QUANTITY = 2147483647;
const adjustmentBatchSelect = { id: true, quantity: true, expiryDate: true };
const movementSelect = {
  id: true,
  type: true,
  quantityChange: true,
  reason: true,
  createdAt: true,
  performedBy: { select: { id: true, fullName: true } },
};

const notFound = () => httpError(404, "BATCH_NOT_FOUND", "Batch not found.");

const requireSaleable = (batch, type, today) => {
  if (type === "SALE" && classifyExpiry(batch.expiryDate, today).expiryStatus === "EXPIRED") {
    throw httpError(409, "SALE_ON_EXPIRED_STOCK", "Expired stock cannot be sold.");
  }
};

const explainGuardFailure = (batch, type, quantityChange, today) => {
  if (!batch) throw notFound();
  requireSaleable(batch, type, today);
  if (quantityChange < 0 && batch.quantity < -quantityChange) {
    throw httpError(409, "INSUFFICIENT_STOCK", "There is not enough stock for this adjustment.");
  }
  if (quantityChange > 0 && batch.quantity > MAX_QUANTITY - quantityChange) {
    throw httpError(409, "STOCK_LIMIT_EXCEEDED", "This adjustment would exceed the maximum batch quantity.");
  }
  // The row may have changed again since the failed statement; do not retry silently.
  throw httpError(409, "STOCK_CHANGED", "Stock changed during this adjustment. Reload and try again.");
};

export const createAdjustment = async (id, input, userId, today) => {
  const { type, quantityChange, reason } = input;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.batch.findUnique({
        where: { id }, select: adjustmentBatchSelect,
      });
      if (!existing) throw notFound();
      requireSaleable(existing, type, today);

      const where = {
        id,
        quantity: quantityChange < 0
          ? { gte: -quantityChange }
          : { gte: 0, lte: MAX_QUANTITY - quantityChange },
      };
      // Re-evaluated by PostgreSQL after any concurrent row update completes.
      if (type === "SALE") where.expiryDate = { gte: today };
      const result = await tx.batch.updateMany({
        where,
        data: { quantity: { increment: quantityChange }, updatedAt: new Date() },
      });
      if (result.count === 0) {
        const current = await tx.batch.findUnique({
          where: { id }, select: adjustmentBatchSelect,
        });
        explainGuardFailure(current, type, quantityChange, today);
      }

      const movement = await tx.stockMovement.create({
        data: {
          id: randomUUID(),
          batchId: id,
          performedById: userId,
          type,
          quantityChange,
          reason,
        },
        select: movementSelect,
      });
      const batch = await tx.batch.findUnique({ where: { id }, select: batchSelect });
      if (!batch) throw notFound();
      return { batch: serializeBatch(batch, today), movement };
    }, { isolationLevel: "ReadCommitted" });
  } catch (error) {
    if (error.code === "P2003") {
      throw httpError(409, "REFERENCE_CONFLICT",
        "A referenced record is no longer available. Reload and try again.");
    }
    throw error;
  }
};

export const listMovements = async (id, { page, pageSize }) =>
  prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({ where: { id }, select: { id: true } });
    if (!batch) throw notFound();
    const where = { batchId: id };
    const total = await tx.stockMovement.count({ where });
    const items = await tx.stockMovement.findMany({
      where,
      select: movementSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }, { isolationLevel: "RepeatableRead" });
