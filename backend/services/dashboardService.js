import { prisma } from "../config/db.js";
import { EXPIRY_BANDS, getBandDateRange } from "../utils/expiryClassification.js";
import { batchSelect, batchOrderBy, buildBatchWhere, serializeBatch } from "../utils/batchQuery.js";

export const getDashboard = async (query, today) => {
  const { page, pageSize } = query;
  const where = { ...buildBatchWhere(query, today), quantity: { gt: 0 } };
  const results = await prisma.$transaction([
    ...EXPIRY_BANDS.map(({ status }) => prisma.batch.count({
      where: { AND: [where, { expiryDate: getBandDateRange(status, today) }] },
    })),
    prisma.batch.findMany({
      where,
      select: batchSelect,
      orderBy: batchOrderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ], { isolationLevel: "RepeatableRead" });
  const counts = Object.fromEntries(EXPIRY_BANDS.map(({ status }, index) =>
    [status, results[index]],
  ));
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return {
    counts,
    earliestExpiring: {
      items: results[EXPIRY_BANDS.length].map((batch) => serializeBatch(batch, today)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};
