import { getStoreToday } from "../config/store.js";
import { validateBatchQuery } from "../utils/validateBatchQuery.js";
import * as batchService from "../services/batchService.js";
import {
  createBatchSchema,
  updateBatchSchema,
  batchIdSchema,
} from "../validators/batchValidators.js";
import { httpError } from "../utils/errors.js";

const validate = (schema, input) => {
  const { error, value } = schema.validate(input, { abortEarly: false });
  if (error) {
    // Forbidden movement fields take precedence over other PATCH body errors.
    if (
      schema === updateBatchSchema &&
      error.details.some((detail) => detail.type === "any.unknown")
    ) {
      throw httpError(
        400,
        "QUANTITY_NOT_EDITABLE",
        "Quantity can only be changed through the stock adjustment endpoint.",
      );
    }
    const idError = error.details.find(
      (detail) =>
        ["id", "productId", "locationId"].includes(detail.path[0]) &&
        detail.type !== "any.required" &&
        detail.type !== "object.unknown",
    );
    if (idError) {
      const label = {
        id: "Batch",
        productId: "Product",
        locationId: "Location",
      }[idError.path[0]];
      throw httpError(400, "INVALID_ID", `${label} id must be a valid UUID.`);
    }
    const detail = error.details[0];
    throw httpError(
      400,
      "VALIDATION_ERROR",
      detail.type === "object.unknown"
        ? "Unknown fields are not allowed."
        : detail.message,
    );
  }
  return value;
};

export const createBatch = async (req, res, next) => {
  try {
    const today = getStoreToday();
    const input = validate(createBatchSchema, req.body);
    res.status(201).json(await batchService.createBatch(input, req.user.id, today));
  } catch (error) {
    next(error);
  }
};

export const listBatches = async (req, res, next) => {
  try {
    const today = getStoreToday();
    const query = validateBatchQuery(req.query);
    res.status(200).json(await batchService.listBatches(query, today));
  } catch (error) {
    next(error);
  }
};

export const getBatch = async (req, res, next) => {
  try {
    const today = getStoreToday();
    const { id } = validate(batchIdSchema, req.params);
    res.status(200).json(await batchService.getBatch(id, today));
  } catch (error) {
    next(error);
  }
};

export const updateBatch = async (req, res, next) => {
  try {
    const today = getStoreToday();
    const { id } = validate(batchIdSchema, req.params);
    const input = validate(updateBatchSchema, req.body);
    res.status(200).json(await batchService.updateBatch(id, input, today));
  } catch (error) {
    next(error);
  }
};
