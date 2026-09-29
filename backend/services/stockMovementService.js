import { randomUUID } from "node:crypto";
import { prisma } from "../config/db.js";
import { httpError } from "../utils/errors.js";

const movementSelect = {
  id: true,
  batchId: true,
  performedById: true,
  type: true,
  quantityChange: true,
  reason: true,
  createdAt: true,
};

export const createStockMovement = async (input, userId) =>
  prisma.$transaction(async (tx) => {
    const { batchId, quantityChange } = input;
    const stockConstraint =
      quantityChange < 0
        ? { gte: -quantityChange }
        : { lte: 2147483647 - quantityChange };
    const update = await tx.batch.updateMany({
      where: { id: batchId, quantity: stockConstraint },
      data: { quantity: { increment: quantityChange }, updatedAt: new Date() },
    });

    if (update.count === 0) {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        select: { id: true },
      });
      if (!batch) {
        throw httpError(404, "BATCH_NOT_FOUND", "Batch not found.");
      }
      throw httpError(
        409,
        quantityChange < 0 ? "INSUFFICIENT_STOCK" : "QUANTITY_LIMIT",
        quantityChange < 0
          ? "The adjustment cannot reduce stock below zero."
          : "The adjustment exceeds the maximum supported stock quantity.",
      );
    }

    return tx.stockMovement.create({
      data: {
        id: randomUUID(),
        batchId,
        performedById: userId,
        type: input.type,
        quantityChange,
        reason: input.reason,
      },
      select: movementSelect,
    });
  });
