import { createStockMovementSchema } from "../validators/stockMovementValidators.js";
import * as stockMovementService from "../services/stockMovementService.js";
import { httpError } from "../utils/errors.js";

export const createStockMovement = async (req, res, next) => {
  try {
    const { error, value } = createStockMovementSchema.validate(req.body);
    if (error) {
      const detail = error.details[0];
      const message =
        detail.type === "object.unknown"
          ? "Unknown fields are not allowed."
          : detail.message;
      throw httpError(400, "VALIDATION_ERROR", message);
    }
    res
      .status(201)
      .json(
        await stockMovementService.createStockMovement(value, req.user.id),
      );
  } catch (error) {
    next(error);
  }
};
