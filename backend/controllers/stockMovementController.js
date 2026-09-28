import * as stockMovementService from "../services/stockMovementService.js";
import { batchIdSchema } from "../validators/batchValidators.js";
import {
  createAdjustmentSchema,
  listMovementsSchema,
} from "../validators/stockMovementValidators.js";
import { getStoreToday } from "../config/store.js";
import { httpError } from "../utils/errors.js";

const validate = (schema, input) => {
  const { error, value } = schema.validate(input, { abortEarly: false });
  if (!error) return value;
  if (schema === batchIdSchema) {
    throw httpError(400, "INVALID_ID", "Batch id must be a valid UUID.");
  }
  // Missing required fields remain validation errors, even alongside other errors.
  const required = error.details.find((detail) => detail.type === "any.required");
  if (!required && schema === createAdjustmentSchema) {
    if (error.details.some((detail) => detail.path[0] === "type")) {
      throw httpError(400, "INVALID_ADJUSTMENT_TYPE",
        "type must be SALE, DAMAGE, DISPOSAL, or CORRECTION. New deliveries go through batch intake.");
    }
    if (error.details.some((detail) => detail.path[0] === "quantityChange")) {
      throw httpError(400, "INVALID_QUANTITY_CHANGE",
        "quantityChange must be a non-zero integer from -1000000 to 1000000; SALE, DAMAGE, and DISPOSAL require a negative change.");
    }
  }
  const detail = required ?? error.details[0];
  throw httpError(400, "VALIDATION_ERROR", detail.type === "object.unknown"
    ? "Unknown fields are not allowed." : detail.message);
};

export const createAdjustment = async (req, res, next) => {
  try {
    const today = getStoreToday();
    const { id } = validate(batchIdSchema, req.params);
    const input = validate(createAdjustmentSchema, req.body);
    const result = await stockMovementService.createAdjustment(id, input, req.user.id, today);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const listMovements = async (req, res, next) => {
  try {
    const { id } = validate(batchIdSchema, req.params);
    const query = validate(listMovementsSchema, req.query);
    res.status(200).json(await stockMovementService.listMovements(id, query));
  } catch (error) {
    next(error);
  }
};
