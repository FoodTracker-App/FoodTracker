import { listBatchesSchema } from "../validators/batchValidators.js";
import { httpError } from "./errors.js";

export const validateBatchQuery = (input) => {
  const { error, value } = listBatchesSchema.validate(input, {
    abortEarly: false,
  });
  if (!error) return value;
  const idError = error.details.find(({ path }) =>
    ["productId", "locationId"].includes(path[0]),
  );
  if (idError) {
    const label = idError.path[0] === "productId" ? "Product" : "Location";
    throw httpError(400, "INVALID_ID", `${label} id must be a valid UUID.`);
  }
  if (error.details.some(({ path }) => path[0] === "status")) {
    throw httpError(
      400,
      "INVALID_FILTER",
      "status must be a valid expiry status.",
    );
  }
  const detail = error.details[0];
  throw httpError(
    400,
    "VALIDATION_ERROR",
    detail.type === "object.unknown"
      ? "Unknown fields are not allowed."
      : detail.message,
  );
};
