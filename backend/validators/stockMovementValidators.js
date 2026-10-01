import Joi from "joi";

export const createStockMovementSchema = Joi.object({
  batchId: Joi.string().uuid().required(),
  type: Joi.string()
    .valid("RECEIPT", "SALE", "DAMAGE", "DISPOSAL", "CORRECTION")
    .required(),
  quantityChange: Joi.number()
    .integer()
    .strict()
    .min(-2147483647)
    .max(2147483647)
    .invalid(0)
    .required(),
  reason: Joi.string().trim().min(5).max(500).required(),
})
  .unknown(false)
  .required();
